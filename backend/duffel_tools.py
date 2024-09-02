from duffel_api import Duffel
from duffel_api.http_client import ApiError
from duffel_api.api.booking.payments import PaymentClient
from duffel_api.api.booking.offer_requests import OfferRequestCreate
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.tools import tool
from typing import Optional
from datetime import datetime
from backend.globals import conversation_state
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Duffel client
duffel_client = Duffel(access_token=os.getenv("DUFFEL_ACCESS_TOKEN"))


class SearchFlights(BaseModel):
    origin: str = Field(..., description="Origin IATA airport code")
    destination: str = Field(..., description="Destination IATA airport code")
    departure_date: str = Field(...,
                                description="Departure date in YYYY-MM-DD format")
    return_date: Optional[str] = Field(
        None, description="Return date in YYYY-MM-DD format (optional)")
    cabin_class: Optional[str] = Field(
        None, description="Cabin class of the flight (optional - economy, business, first - lowercase only)")


@tool
def search_flights(data: SearchFlights):
    """Initial search for flights with the given details."""
    client = duffel_client
    slices = [
        {"origin": data.origin, "destination": data.destination,
            "departure_date": data.departure_date},
    ]
    if data.return_date:
        slices.append({"origin": data.destination,
                      "destination": data.origin, "departure_date": data.return_date})

    try:
        if data.cabin_class:
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
        return f"Invalid cabin class: {e}. Please use one of: economy, premium_economy, business, first."
    except Exception as e:
        return f"An error occurred while searching for flights: {str(e)}"


class ReturnMoreFlightsFromSearch(BaseModel):
    offer_request_id: str = Field(...,
                                  description="Offer Request ID from the initial search")


@tool
def return_more_flights_from_search(data: ReturnMoreFlightsFromSearch):
    """Return more flights from the initial search to save time"""
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
        return f"We can't find your original offer list. Try searching flights again: {e}"


class SelectOffer(BaseModel):
    offer_id: str = Field(..., description="Selected offer ID")


@tool
def select_offer(data: SelectOffer):
    """Choose an offer to proceed with booking. This is a required step before booking a flight."""
    conversation_state['selected_offer_id'] = data.offer_id
    return json.dumps({"selected_offer_id": data.offer_id})


class BookFlight(BaseModel):
    id: str = Field(..., description="Selected offer ID")
    given_name: str = Field(..., description="Passenger's given name")
    family_name: str = Field(..., description="Passenger's family name")
    born_on: str = Field(..., description="Passenger's date of birth")
    title: str = Field(
        None, description="Passenger's title (mr, ms, mrs, miss)")
    gender: str = Field(...,
                        description="Passenger's gender (m for male, f for female)")
    phone_number: str = Field(..., description="Passenger's phone number")
    email: str = Field(..., description="Passenger's email")


@tool
def book_flight(data: BookFlight):
    """Put a flight booking on hold with the given offer and passenger details. This is not a complete booking, it is just a hold on the flight. You will need to create a payment for the hold before the flight can be booked."""
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


class CreatePayment(BaseModel):
    order_id: str = Field(..., description="Order ID for the held booking")
    amount: str = Field(..., description="Payment amount")
    currency: str = Field(..., description="Payment currency")
    payment_type: str = Field(...,
                              description="Payment type (e.g., 'balance', 'card')")


@tool
def create_payment(data: CreatePayment):
    """Create a payment for the held booking. After creating a payment, the flight can be fully booked and a confirmation should be returned to to the user."""
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


class CancelFlight(BaseModel):
    order_id: str = Field(..., description="Order ID to cancel")


@tool
def cancel_flight(data: CancelFlight):
    """Cancel a flight with the given order ID."""
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
