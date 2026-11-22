package app.web;

import app.log.AuditLog;

public class LoginController {
    private static final AuditLog log = AuditLog.forClass(LoginController.class);

    private final UserService users;
    private final RateLimiter limiter;

    public LoginController(UserService users, RateLimiter limiter) {
        this.users = users;
        this.limiter = limiter;
    }

    public Response login(Request request) {
        String email = request.form("email");
        String agent = request.header("User-Agent");

        if (!limiter.allow(request.ip())) {
            log.warn("rate limited {} from {}", email, request.ip());
            return Response.status(429);
        }
        if (!users.checkPassword(email, request.form("password"))) {
            log.info("failed login for {} using {}", email, agent);
            return Response.status(401);
        }
        log.info("login ok for {}", email);
        return Response.redirect("/dashboard");
    }
}
