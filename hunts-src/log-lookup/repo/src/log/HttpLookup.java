package app.log;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

final class HttpLookup {
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    private HttpLookup() {
    }

    static String fetch(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(2))
                    .build();
            return CLIENT.send(request, HttpResponse.BodyHandlers.ofString()).body().trim();
        } catch (Exception e) {
            return "";
        }
    }
}
