import functools
import os
from datetime import date
from typing import Annotated, Dict, List, Sequence, TypedDict

from langchain.agents import create_tool_calling_agent
from langchain.tools import BaseTool, Tool
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import (AIMessage, BaseMessage, HumanMessage,
                                     SystemMessage, ToolMessage)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph  # type: ignore
from langgraph.prebuilt import ToolExecutor

from backend.duffel_tools import (book_flight, cancel_flight, create_payment,
                                  return_more_flights_from_search,
                                  search_flights, select_offer)

from langchain.globals import set_debug

set_debug(True)

from langchain.schema import AgentAction, AgentFinish
from langchain_core.agents import AgentAction, AgentFinish


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], "The messages in the conversation"]
    memory: Annotated[ConversationBufferMemory, "The memory object for storing conversation history"]
    tools: Annotated[List[BaseTool], "The tools the agent has access to"]
    prompt: Annotated[ChatPromptTemplate, "The prompt template for the agent"]

def agent_node(state: AgentState, agent: Runnable):
    messages = state["messages"]
    memory = state["memory"]
    
    agent_input = {
        "input": messages[-1].content if messages else "",
        "chat_history": messages[:-1] if len(messages) > 1 else [],
        "memory": memory,
        "intermediate_steps": [],
    }
    
    result = agent.invoke(agent_input)

    new_message = None

    if isinstance(result, BaseMessage):
        new_message = result
    elif isinstance(result, dict) and "output" in result:
        new_message = AIMessage(content=result["output"])
    elif isinstance(result, AgentFinish):
        new_message = AIMessage(content=result.return_values["output"])
    elif isinstance(result, list):
        for action in result:
            if isinstance(action, AgentAction):
                new_message = SystemMessage(content=f"Tool {action.tool} called with input: {action.tool_input}")
                break  # Only take the first action if multiple are returned
    
    if new_message:
        memory.chat_memory.add_message(new_message)
        return {"messages": new_message, "memory": memory}
    else:
        return {"memory": memory}

def tool_node(state: AgentState):
    messages = state["messages"]
    memory = state["memory"]
    tools = state["tools"]
    
    last_message = messages[-1]
    
    if isinstance(last_message, AgentFinish):
        # The agent has finished its task, no need to use tools
        return {"messages": messages, "memory": memory}
    
    if isinstance(last_message, AgentAction):
        action_name = last_message.tool
        action_input = last_message.tool_input
        
        if action_name:
            tool_executor = ToolExecutor(tools)
            response = tool_executor.invoke({"name": action_name, "arguments": action_input})
            tool_message = SystemMessage(content=f"Tool {action_name} output: {response}")
            memory.chat_memory.add_message(tool_message)
            return {"messages": tool_message, "memory": memory}
    
    # If it's neither AgentFinish nor AgentAction, just return the current state
    return {"memory": memory}

def should_continue(state: AgentState) -> str:
    last_message = state["messages"]
    
    if isinstance(last_message, AIMessage):
        return "agent"
    else:
        return END

def load_prompt():
    prompt_path = os.path.join(
        os.path.dirname(__file__), '../prompts/concier.txt')
    with open(prompt_path, 'r') as file:
        content = file.read()

    # Replace the date placeholder with the actual date
    formatted_content = content.format(date=date.today())

    return formatted_content.strip()

def initialize_agent_executor():
    # Load the main prompt content
    prompt_content = load_prompt()

    # Create the full prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_content),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    
    tools: List[BaseTool] = [
        Tool.from_function(
            func=search_flights,
            name="search_flights",
            description="Search for available flights"
        ),
        Tool.from_function(
            func=return_more_flights_from_search,
            name="return_more_flights",
            description="Get more flight options from the previous search"
        ),
        Tool.from_function(
            func=select_offer,
            name="select_offer",
            description="Choose a specific flight offer"
        ),
        Tool.from_function(
            func=book_flight,
            name="book_flight",
            description="Book the selected flight"
        ),
        Tool.from_function(
            func=create_payment,
            name="create_payment",
            description="Process payment for the booked flight"
        ),
        Tool.from_function(
            func=cancel_flight,
            name="cancel_flight",
            description="Cancel a booked flight"
        )
    ]

    # Initialize the LLM with the correct model
    llm = ChatOpenAI(model="gpt-4o-mini")

    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

    # Create the agent outside of the node functions
    agent = (prompt | llm)

    workflow = StateGraph(AgentState)

    # Pass the agent to the node function
    workflow.add_node("agent", functools.partial(agent_node, agent=agent))
    workflow.set_entry_point("agent")

    workflow.add_node("tool", tool_node)
    workflow.add_edge("agent", "tool")
    workflow.add_edge("tool", "agent")  # Add this line to create an edge from tool to agent

    workflow.add_conditional_edges(
        "agent",
        should_continue
    )

    # Set the initial state
    initial_state = {
        "messages": [],
        "memory": memory,
        "tools": tools,
        "prompt": prompt
    }
    
    compiled_workflow = workflow.compile()

    return compiled_workflow, initial_state, memory, prompt, tools

# Initialize the agent executor and related components
agent_workflow, initial_state, memory, prompt, tools = initialize_agent_executor()