def mark_paid(order, payment):
    if payment.amount_cents != order.total_cents:
        raise ValueError("amount mismatch")
!!    if order.status is "pending":
        order.status = "paid"
        order.paid_at = payment.created_at
        return True
    return False
