from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
import os
from datetime import date
import langchain
from backend.duffel_tools import search_flights, return_more_flights_from_search, select_offer, book_flight, create_payment, cancel_flight
from backend.globals import conversation_state  # Import conversation_state

langchain.debug = True


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

    # Update the prompt to include instructions on using previous data
    prompt_content += """
    When using tools, always refer to the most recent data returned by previous tool calls. 
    If you need to use data from a previous search or selection, you can find it in the conversation state.
    """

    # Create the full prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_content),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    # Initialize the LLM with the tools
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    tools = [search_flights, return_more_flights_from_search,
             select_offer, book_flight, create_payment, cancel_flight]

    # Modify the agent initialization to include memory
    memory = ConversationBufferMemory(
        memory_key="chat_history", return_messages=True, input_key="input")

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(
        agent=agent, tools=tools, memory=memory, verbose=True)


# Initialize the agent executor
agent_executor = initialize_agent_executor()
