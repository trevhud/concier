import json
import logging
import os
import re
from datetime import date, datetime, timedelta
from typing import Optional

from duffel_api import Duffel
from duffel_api.api.booking.offer_requests import OfferRequestCreate
from duffel_api.api.booking.payments import PaymentClient
from duffel_api.http_client import ApiError
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain_core.tools import tool

from backend.globals import conversation_state

duffel_client = Duffel(access_token=os.getenv("DUFFEL_ACCESS_TOKEN"))

# Add this near the top of the file, after imports
logger = logging.getLogger(__name__)

class SearchFlights(BaseModel):
    origin: str = Field(..., description="Origin IATA airport code")
    destination: str = Field(..., description="Destination IATA airport code")
    departure_date: str = Field(..., description="Departure date in YYYY-MM-DD format")
    return_date: Optional[str] = Field(None, description="Return date in YYYY-MM-DD format (optional)")
    cabin_class: Optional[str] = Field(None, description="Cabin class of the flight (optional - economy, business, first - lowercase only)")

    @validator('origin', 'destination')
    def validate_airport_code(cls, v):
        if not (isinstance(v, str) and len(v) == 3 and v.isalpha()):
            raise ValueError(f"Invalid airport code: {v}. Must be a 3-letter IATA code.")
        return v.upper()

    @validator('departure_date', 'return_date')
    def validate_date(cls, v):
        if v:
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
                raise ValueError(f"Invalid date format: {v}. Use YYYY-MM-DD.")
            
            year, month, day = map(int, v.split('-'))
            input_date = date(year, month, day)
            today = date.today()
            max_future_date = today + timedelta(days=730)  # 2 years from today

            if input_date < today:
                raise ValueError("Date cannot be in the past")
            if input_date > max_future_date:
                raise ValueError(f"Date cannot be more than 2 years in the future. Max allowed date: {max_future_date}")

        return v

    @validator('return_date')
    def validate_return_date(cls, v, values):
        if v and 'departure_date' in values:
            departure_date = values['departure_date']
            departure = date(*map(int, departure_date.split('-')))
            return_d = date(*map(int, v.split('-')))
            
            if return_d < departure:
                raise ValueError("Return date cannot be earlier than departure date")

        return v

    @validator('cabin_class')
    def validate_cabin_class(cls, v):
        if v and v.lower() not in ['economy', 'business', 'first']:
            raise ValueError(f"Invalid cabin class: {v}. Use economy, business, or first.")
        return v.lower() if v else None

class ReturnMoreFlightsFromSearch(BaseModel):
    offer_request_id: str = Field(..., description="Offer Request ID from the initial search")

    @validator('offer_request_id')
    def validate_offer_request_id(cls, v):
        if not re.match(r'^orq_[A-Za-z0-9]{22}$', v):
            raise ValueError("Invalid offer request ID format. It should start with 'orq_' followed by 24 alphanumeric characters.")
        return v

class SelectOffer(BaseModel):
    offer_id: str = Field(..., description="Selected offer ID")

    @validator('offer_id')
    def validate_offer_id(cls, v):
        if not re.match(r'^off_[A-Za-z0-9]{22}$', v):
            raise ValueError("Invalid offer ID format. It should start with 'off_' followed by 24 alphanumeric characters.")
        return v

class BookFlight(BaseModel):
    id: str = Field(..., description="Selected offer ID")
    given_name: str = Field(..., description="Passenger's given name")
    family_name: str = Field(..., description="Passenger's family name")
    born_on: str = Field(..., description="Passenger's date of birth (YYYY-MM-DD)")
    title: str = Field(..., description="Passenger's title (mr, ms, mrs, miss)")
    gender: str = Field(..., description="Passenger's gender (m for male, f for female)")
    phone_number: str = Field(..., description="Passenger's phone number in E.164 format (e.g., '+442080160509')")
    email: str = Field(..., description="Passenger's email")

    @validator('id')
    def validate_id(cls, v):
        if not re.match(r'^off_[A-Za-z0-9]{22}$', v):
            raise ValueError("Invalid offer ID format. It should start with 'off_' followed by 24 alphanumeric characters.")
        return v

    @validator('given_name', 'family_name')
    def validate_name(cls, v, field):
        # Regex for allowed characters
        allowed_chars = r"^[A-Za-zÀ-ÿ\s\-']+$"
        # Exceptions
        exceptions = ['Æ', 'æ', 'Ĳ', 'ĳ', 'Œ', 'œ', 'Þ', 'ð']
        
        if not re.match(allowed_chars, v) or any(char in v for char in exceptions):
            raise ValueError(f"Invalid {field.name}. Only space, -, ', and letters from ASCII, Latin-1 Supplement, and Latin Extended-A (with some exceptions) are allowed.")
        
        if len(v) < 2:
            raise ValueError(f"{field.name} should be at least 2 characters long.")
        
        return v.title()

    @validator('given_name', 'family_name')
    def validate_combined_name_length(cls, v, values):
        other_name = values.get('given_name') if 'family_name' in values else values.get('family_name')
        if other_name and len(v) + len(other_name) > 40:
            raise ValueError("Combined length of given_name and family_name should not exceed 40 characters.")
        return v

    @validator('born_on')
    def validate_born_on(cls, v):
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError(f"Invalid date format: {v}. Use YYYY-MM-DD.")
        year, month, day = map(int, v.split('-'))
        if date(year, month, day) > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v

    @validator('title')
    def validate_title(cls, v):
        valid_titles = ['mr', 'ms', 'mrs', 'miss']
        if v.lower() not in valid_titles:
            raise ValueError(f"Invalid title. Must be one of: {', '.join(valid_titles)}")
        return v.lower()

    @validator('gender')
    def validate_gender(cls, v):
        if v.lower() not in ['m', 'f']:
            raise ValueError("Gender must be 'm' for male or 'f' for female")
        return v.lower()

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError("Invalid phone number format. It must be in E.164 format: '+' followed by 1-14 digits, e.g., '+442080160509'")
        return v

    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError("Invalid email format")
        return v

class CreatePayment(BaseModel):
    order_id: str = Field(..., description="Order ID for the held booking")
    amount: str = Field(..., description="Payment amount")
    currency: str = Field(..., description="Payment currency")
    payment_type: str = Field(..., description="Payment type (e.g., 'balance', 'card')")

    @validator('order_id')
    def validate_order_id(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Order ID must be a non-empty string")
        return v

    @validator('amount')
    def validate_amount(cls, v):
        try:
            float(v)
        except ValueError:
            raise ValueError("Amount must be a valid number")
        return v

    @validator('currency')
    def validate_currency(cls, v):
        if not v or not isinstance(v, str) or len(v) != 3:
            raise ValueError("Currency must be a 3-letter code")
        return v.upper()

    @validator('payment_type')
    def validate_payment_type(cls, v):
        valid_types = ['balance', 'card']
        if v.lower() not in valid_types:
            raise ValueError(f"Invalid payment type. Must be one of: {', '.join(valid_types)}")
        return v.lower()

class CancelFlight(BaseModel):
    order_id: str = Field(..., description="Order ID to cancel")

    @validator('order_id')
    def validate_order_id(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Order ID must be a non-empty string")
        return v

@tool
def search_flights(data: SearchFlights):
    """
    Search for flights with the given details.
    
    Args:
        data (SearchFlights): The search parameters including origin, destination, dates, and optional cabin class.
    
    Returns:
        str: JSON string containing the search results or error message.
    """
    client = duffel_client
    slices = [
        {"origin": data.origin, "destination": data.destination, "departure_date": data.departure_date},
    ]
    if data.return_date:
        slices.append({"origin": data.destination, "destination": data.origin, "departure_date": data.return_date})

    try:
        offer_request = (
            client.offer_requests.create()
            .passengers([{"type": "adult"}])
            .slices(slices)
            .return_offers()
        )
        
        if data.cabin_class:
            offer_request = offer_request.cabin_class(data.cabin_class)
        
        offer_request = offer_request.execute()

        def format_datetime(dt):
            return dt.isoformat() if isinstance(dt, datetime) else dt

        result = {
            'offer_request_id': offer_request.id,
            'offers': [
                {
                    'id': offer.id,
                    'airline': offer.owner.name,
                    'flights': {
                        'outbound': {
                            'departing_at': format_datetime(offer.slices[0].segments[0].departing_at),
                            'arriving_at': format_datetime(offer.slices[0].segments[-1].arriving_at)
                        },
                        'return': {
                            'departing_at': format_datetime(offer.slices[1].segments[0].departing_at),
                            'arriving_at': format_datetime(offer.slices[1].segments[-1].arriving_at)
                        } if len(offer.slices) > 1 else None
                    },
                    'total_amount': offer.total_amount,
                    'total_currency': offer.total_currency
                } for offer in offer_request.offers
            ]
        }
        conversation_state['last_search_result'] = result
        return json.dumps(result)
    except OfferRequestCreate.InvalidCabinClass as e:
        return json.dumps({"error": f"Invalid cabin class: {e}. Please use one of: economy, premium_economy, business, first."})
    except Exception as e:
        return json.dumps({"error": f"An error occurred while searching for flights: {str(e)}"})

@tool
def return_more_flights_from_search(data: ReturnMoreFlightsFromSearch):
    """
    Return more flights from the initial search to save time.
    
    Args:
        data (ReturnMoreFlightsFromSearch): The offer request ID from the initial search.
    
    Returns:
        str: JSON string containing additional flight offers or error message.
    """
    client = duffel_client
    try:
        offer_request = client.offer_requests.list(limit=200)
        result = {
            'offer_request_id': offer_request.id,
            'offers': [
                {
                    'id': offer.id,
                    'airline': offer.owner.name,
                    'flights': {
                        'outbound': {
                            'departing_at': offer.slices[0].segments[0].departing_at,
                            'arriving_at': offer.slices[0].segments[-1].arriving_at
                        },
                        'return': {
                            'departing_at': offer.slices[1].segments[0].departing_at,
                            'arriving_at': offer.slices[1].segments[-1].arriving_at
                        } if len(offer.slices) > 1 else None
                    },
                    'total_amount': offer.total_amount,
                    'total_currency': offer.total_currency
                } for offer in offer_request.offers
            ]
        }
        conversation_state['last_search_result'] = result
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": f"We can't find your original offer list. Try searching flights again: {e}"})

@tool
def select_offer(data: SelectOffer):
    """
    Choose an offer to proceed with booking. This is a required step before booking a flight.
    Retrieves the latest offer details using the Duffel Python client.
    
    Args:
        data (SelectOffer): The selected offer ID.
    
    Returns:
        str: JSON string containing the selected offer details or error message.
    """

    client = duffel_client

    try:
        offer = client.offers.get(data.offer_id)
        
        # Store the selected offer ID in the conversation state
        conversation_state['selected_offer_id'] = data.offer_id
        
        # Return a simplified version of the offer data
        simplified_offer = {
            "id": offer.id,
            "total_amount": offer.total_amount,
            "total_currency": offer.total_currency,
            "expires_at": offer.expires_at,
            "slices": [
                {
                    "origin": slice.origin.iata_code,
                    "destination": slice.destination.iata_code,
                    "departure_date": slice.segments[0].departing_at.split("T")[0]
                }
                for slice in offer.slices
            ]
        }
        return json.dumps(simplified_offer)
    except Exception as e:
        return json.dumps({"error": f"Failed to retrieve offer: {str(e)}"})

@tool
def book_flight(data: BookFlight):
    """
    Put a flight booking on hold with the given offer and passenger details.
    
    Args:
        data (BookFlight): The booking details including offer ID and passenger information.
    
    Returns:
        str: JSON string containing the booking result or error message.
    """
    client = duffel_client
    try:
        offer = client.offers.get(data.id)

        if not offer:
            return json.dumps({"error": f"Offer with ID {data.id} not found."})

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

        result = {
            "order_id": order.id,
            "booking_reference": order.booking_reference
        }
        conversation_state['last_booking'] = result
        return json.dumps(result)
    except ApiError as e:
        return json.dumps({"error": f"Failed to put flight on hold: {e}"})

@tool
def create_payment(data: CreatePayment):
    """
    Create a payment for the held booking.
    
    Args:
        data (CreatePayment): The payment details including order ID, amount, currency, and payment type.
    
    Returns:
        str: JSON string containing the payment result or error message.
    """
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
        result = {"payment_id": payment_response.id}
        conversation_state['last_payment'] = result
        return json.dumps(result)
    except PaymentClient.InvalidPayment as e:
        return json.dumps({"error": f"Invalid payment data: {e}"})
    except PaymentClient.InvalidPaymentType as e:
        return json.dumps({"error": f"Invalid payment type: {e}"})
    except ApiError as e:
        return json.dumps({"error": f"Failed to create payment: {e}"})

@tool
def cancel_flight(data: CancelFlight):
    """
    Cancel a flight with the given order ID.
    
    Args:
        data (CancelFlight): The order ID to cancel.
    
    Returns:
        str: JSON string containing the cancellation result or error message.
    """
    client = duffel_client
    try:
        order_cancellation = client.order_cancellations.create(data.order_id)
        client.order_cancellations.confirm(order_cancellation.id)
        result = {
            "order_id": data.order_id,
            "refund_amount": order_cancellation.refund_amount,
            "refund_currency": order_cancellation.refund_currency
        }
        conversation_state['last_cancellation'] = result
        return json.dumps(result)
    except ApiError as e:
        logger.error(f"Failed to cancel flight: {e}")
        return json.dumps({"error": f"Failed to cancel flight: {e}"})
