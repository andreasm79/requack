class ValidationError(Exception):
    pass


def validate_channel(channel, template_types):
    for instance in channel["instances"]:
        template = template_types.get(instance["type"])
        if template is None:
            raise ValidationError(f"unknown template type {instance['type']}")
        if len(instance["criteria"]) != template["fields"]:
            raise ValidationError(
                f"{instance['id']}: expected {template['fields']} criteria"
            )
        for criterion in instance["criteria"]:
            if not isinstance(criterion, str):
                raise ValidationError(f"{instance['id']}: criteria must be strings")
