package com.apexeval.backend.orchestration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Emits the SubmissionEvent after every /api/run-test call.
 * If apexeval.webhook.url is unset/blank, defaults to a no-op logger
 * (per master prompt requirement) instead of failing the request.
 */
@Component
public class WebhookEmitter {

    private static final Logger log = LoggerFactory.getLogger(WebhookEmitter.class);

    private final String webhookUrl;
    private final RestClient restClient;

    public WebhookEmitter(@Value("${apexeval.webhook.url:}") String webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.restClient = RestClient.create();
    }

    public void emit(SubmissionEvent event) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.info("[webhook:no-op] {} | {} | {}",
                    event.getAssignmentId(), event.getOverallStatus(), event.getTimestamp());
            return;
        }

        try {
            restClient.post()
                    .uri(webhookUrl)
                    .body(event)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            // Webhook delivery failure must never break the main /api/run-test response.
            log.warn("Webhook delivery failed for {}: {}", webhookUrl, e.getMessage());
        }
    }
}
