from flask import Flask, request, jsonify, send_from_directory, Response, redirect, url_for, render_template, Blueprint, make_response
from flask_cors import CORS
from datetime import date
from typing import Optional
from duffel_api import Duffel
from duffel_api.http_client import ApiError
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage, HumanMessage
import os
import logging
from dotenv import load_dotenv
import langchain
import io
import json

langchain.debug = True

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Duffel client
duffel_client = Duffel(access_token=os.getenv("DUFFEL_ACCESS_TOKEN"))

class SearchFlights(BaseModel):
    origin: str = Field(..., description="Origin IATA airport code")
    destination: str = Field(..., description="Destination IATA airport code")
    departure_date: str = Field(..., description="Departure date in YYYY-MM-DD format")
    return_date: Optional[str] = Field(None, description="Return date in YYYY-MM-DD format (optional)")
    cabin_class: Optional[str] = Field(None, description="Cabin class of the flight (optional - economy, business, first - lowercase only)")

@tool
def search_flights(data: SearchFlights):
    """Search for flights with the given details."""
    print(data)
    client = duffel_client
    slices = [
        {"origin": data.origin, "destination": data.destination, "departure_date": data.departure_date},
    ]
    if data.return_date:
        slices.append({"origin": data.destination, "destination": data.origin, "departure_date": data.return_date})
    
    try:
        if data.cabin_class:
            # Convert cabin_class to lowercase
            cabin_class = data.cabin_class.lower()
            offer_request = (
                client.offer_requests.create()
                .passengers([{"type": "adult"}])
                .slices(slices)
                .return_offers()
                .cabin_class(cabin_class)
                .execute()
            )
        else:
            offer_request = (
                client.offer_requests.create()
                .passengers([{"type": "adult"}])
                .slices(slices)
                .return_offers()
                .execute()
            )

        return [(offer.id, offer.owner.name, {'outbound': {'departing_at': offer.slices[0].segments[0].departing_at, 'arriving_at': offer.slices[0].segments[0].arriving_at}, 'return': {'departing_at': offer.slices[1].segments[0].departing_at, 'arriving_at': offer.slices[1].segments[0].arriving_at}}, offer.total_amount, offer.total_currency) for offer in offer_request.offers]
    except OfferRequestCreate.InvalidCabinClass as e:
        return f"Invalid cabin class: {e}. Please use one of: economy, premium_economy, business, first."
    except Exception as e:
        return f"An error occurred while searching for flights: {e}"

class SelectOffer(BaseModel):
    offer_id: str = Field(..., description="Selected offer ID")

@tool
def select_offer(data: SelectOffer):
    """Select an offer to proceed with booking."""
    return data.offer_id

class BookFlight(BaseModel):
    id: str = Field(..., description="Selected offer ID")
    given_name: str = Field(..., description="Passenger's given name")
    family_name: str = Field(..., description="Passenger's family name")
    born_on: str = Field(..., description="Passenger's date of birth")
    title: Optional[str] = Field(None, description="Passenger's title")
    gender: Optional[str] = Field(None, description="Passenger's gender (m for male, f for female)")
    phone_number: str = Field(..., description="Passenger's phone number")
    email: str = Field(..., description="Passenger's email")

@tool
def book_flight(data: BookFlight):
    """Put a flight booking on hold with the given offer and passenger details."""
    client = duffel_client
    try:
        # Retrieve the offer details
        offer = client.offers.get(data.id)
        
        if not offer:
            return f"Offer with ID {data.id} not found."

        passengers = [
            {
                "phone_number": data.phone_number,
                "email": data.email,
                "title": data.title,
                "gender": data.gender,
                "family_name": data.family_name,
                "given_name": data.given_name,
                "born_on": data.born_on,
                "id": offer.passengers[0].id,
            }
        ]

        order = (
            client.orders.create()
            .passengers(passengers)
            .selected_offers([data.id])
            .hold()
            .execute()
        )

        return f"Created hold order {order.id} with booking reference {order.booking_reference}"
    except ApiError as e:
        return f"Failed to put flight on hold: {e}"

from duffel_api.api.booking.payments import PaymentClient

class CreatePayment(BaseModel):
    order_id: str = Field(..., description="Order ID for the held booking")
    amount: str = Field(..., description="Payment amount")
    currency: str = Field(..., description="Payment currency")
    payment_type: str = Field(..., description="Payment type (e.g., 'balance')")

@tool
def create_payment(data: CreatePayment):
    """Create a payment for the held booking."""
    client = PaymentClient(access_token=os.getenv("DUFFEL_ACCESS_TOKEN"))
    try:
        payment = {
            "amount": data.amount,
            "currency": data.currency,
            "type": data.payment_type
        }
        payment_response = (
            client.create()
            .order(data.order_id)
            .payment(payment)
            .execute()
        )
        return f"Payment created with ID {payment_response.id}"
    except PaymentClient.InvalidPayment as e:
        return f"Invalid payment data: {e}"
    except PaymentClient.InvalidPaymentType as e:
        return f"Invalid payment type: {e}"
    except ApiError as e:
        return f"Failed to create payment: {e}"

class CancelFlight(BaseModel):
    order_id: str = Field(..., description="Order ID to cancel")

@tool
def cancel_flight(data: CancelFlight):
    """Cancel a flight with the given order ID."""
    client = duffel_client
    try:
        order_cancellation = client.order_cancellations.create(data.order_id)
        client.order_cancellations.confirm(order_cancellation.id)
        return f"Order {data.order_id} has been canceled. Refund amount: {order_cancellation.refund_amount} {order_cancellation.refund_currency}"
    except ApiError as e:
        logger.error(f"Failed to cancel flight: {e}")
        return f"Failed to cancel flight: {e}"

# Define the chat prompt template
def load_prompt():
    prompt_path = os.path.join(os.path.dirname(__file__), 'prompt.txt')
    with open(prompt_path, 'r') as file:
        content = file.read()
    
    # Replace the date placeholder with the actual date
    formatted_content = content.format(date=date.today())
    
    return formatted_content.strip()

# Load the main prompt content
prompt_content = load_prompt()

# Create the full prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", prompt_content),
    ("placeholder", "{chat_history}"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# Initialize the LLM with the tools
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
tools = [search_flights, select_offer, book_flight, create_payment, cancel_flight]
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True) #return_intermediate_steps = True

app = Flask(__name__, static_folder='./build', static_url_path='/')

CORS(app, supports_credentials=True)

@app.route('/')
def serve_react():
    return send_from_directory(app.static_folder, 'index.html')

# File to store chat history
CHAT_HISTORY_FILE = 'chat_history.json'

def load_chat_history():
    try:
        with open(CHAT_HISTORY_FILE, 'r') as f:
            content = f.read()
            return json.loads(content) if content else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_chat_history(chat_history):
    with open(CHAT_HISTORY_FILE, 'w') as f:
        json.dump(chat_history, f)

# Function to calculate the number of tokens in a message
def count_tokens(message):
    return len(message['text'].split())

# Function to manage chat history
def manage_chat_history(chat_history, max_tokens=100000):
    total_tokens = sum(count_tokens(msg) for msg in chat_history)
    
    while total_tokens > max_tokens and chat_history:
        removed_message = chat_history.pop(0)
        total_tokens -= count_tokens(removed_message)

def convert_message_format(message, for_agent=True):
    if for_agent:
        return {
            "role": "user" if message["sender"] == "user" else "assistant",
            "content": message["text"]
        }
    else:
        return {
            "sender": "user" if message["role"] == "user" else "bot",
            "text": message["content"]
        }

# Load chat history at startup
chat_history = load_chat_history()

@app.route('/chat', methods=['POST'])
def chat():
    global chat_history

    user_input = request.json.get("input")
    
    # Add user input to the chat history
    chat_history.append({"text": user_input, "sender": "user"})

    # Manage the chat history to ensure it doesn't exceed the token limit
    manage_chat_history(chat_history)

    # Convert chat history for the agent
    agent_chat_history = [convert_message_format(msg) for msg in chat_history]

    # Invoke the agent with the converted chat history
    response = agent_executor.invoke(
        {
            "input": user_input,
            "chat_history": agent_chat_history,
        }
    )

    # Add agent response to the chat history
    bot_message = convert_message_format({"role": "assistant", "content": response["output"]}, for_agent=False)
    chat_history.append(bot_message)

    # Manage the chat history again
    manage_chat_history(chat_history)

    # Save the updated chat history
    save_chat_history(chat_history)

    return jsonify({"response": response["output"]})

@app.route('/clear_chat', methods=['POST'])
def clear_chat():
    global chat_history
    chat_history = []
    save_chat_history(chat_history)
    return jsonify({"message": "Chat history cleared"})

@app.after_request
def after_request(response):
    # print("After request: Adding CORS headers")
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    # print("Response headers:", dict(response.headers))
    return response


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)