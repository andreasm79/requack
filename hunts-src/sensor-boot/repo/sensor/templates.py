TEMPLATE_TYPES = {
    "ipc": {
        "fields": 21,
        "names": [
            "pipe_name", "client_pid", "client_image", "server_pid", "server_image",
            "access_mask", "session_id", "integrity", "user_sid", "parent_image",
            "command_line", "signer", "is_signed", "remote", "protocol",
            "endpoint", "auth_level", "impersonation", "flags", "thread_id",
            "named_pipe_path",
        ],
    },
}


def load_template_types():
    return TEMPLATE_TYPES
