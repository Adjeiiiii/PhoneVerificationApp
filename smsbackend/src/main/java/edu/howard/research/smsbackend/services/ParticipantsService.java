package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.ParticipantDetail;
import edu.howard.research.smsbackend.models.dto.ParticipantSummary;

import java.util.List;
import java.util.Map;

public interface ParticipantsService {

    /**
     * Returns a paginated response map with keys:
     *  - "data": List<ParticipantSummary>
     *  - "page": int
     *  - "limit": int
     *  - "total": long
     */
    Map<String, Object> list(int page, int limit, String search);

    /**
     * Fetches a single participant’s details.
     */
    ParticipantDetail getOne(String phone);

    /**
     * Marks participant as opted out (stub).
     * Returns a simple map: { ok, phone, status }.
     */
    Map<String, Object> unsubscribe(String phone);

    /**
     * Marks participant as subscribed (stub).
     * Returns a simple map: { ok, phone, status }.
     */
    Map<String, Object> resubscribe(String phone);
}
