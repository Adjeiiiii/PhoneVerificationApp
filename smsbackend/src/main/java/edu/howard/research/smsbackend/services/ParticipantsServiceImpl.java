package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.exceptions.NotFoundException;
import edu.howard.research.smsbackend.models.dto.ParticipantDetail;
import edu.howard.research.smsbackend.models.dto.ParticipantSummary;
import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.models.entities.ParticipantStatus;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import edu.howard.research.smsbackend.util.PhoneNumberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParticipantsServiceImpl implements ParticipantsService {

    private final ParticipantRepository participantRepository;
    private final PhoneNumberService phoneNumberService;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> list(int page, int limit, String search) {
        int pageIndex = Math.max(page - 1, 0);
        int pageSize  = Math.max(limit, 1);
        Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Participant> result = (search != null && !search.isBlank())
                ? participantRepository.findByPhoneContainingIgnoreCase(search.trim(), pageable)
                : participantRepository.findAll(pageable);

        List<ParticipantSummary> data = result.getContent().stream()
                .map(this::toSummary)
                .toList();

        return Map.of(
                "data", data,
                "page", page,
                "limit", limit,
                "total", result.getTotalElements()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ParticipantDetail getOne(String phone) {
        String e164 = phoneNumberService.normalizeToE164(phone);
        Participant p = participantRepository.findByPhone(e164)
                .orElseThrow(() -> new NotFoundException("Participant not found for phone: " + e164));
        return toDetail(p);
    }

    @Override
    @Transactional
    public Map<String, Object> unsubscribe(String phone) {
        String e164 = phoneNumberService.normalizeToE164(phone);
        Participant p = participantRepository.findByPhone(e164)
                .orElseThrow(() -> new NotFoundException("Participant not found for phone: " + e164));

        if (p.getStatus() != ParticipantStatus.OPTED_OUT) {
            p.setStatus(ParticipantStatus.OPTED_OUT);
            participantRepository.save(p);
            log.info("Participant {} set to opted_out", e164);
        }

        return Map.of("ok", true, "phone", p.getPhone(), "status", toStatusString(p.getStatus()));
    }

    @Override
    @Transactional
    public Map<String, Object> resubscribe(String phone) {
        String e164 = phoneNumberService.normalizeToE164(phone);
        Participant p = participantRepository.findByPhone(e164)
                .orElseThrow(() -> new NotFoundException("Participant not found for phone: " + e164));

        if (p.getStatus() != ParticipantStatus.SUBSCRIBED) {
            p.setStatus(ParticipantStatus.SUBSCRIBED);
            participantRepository.save(p);
            log.info("Participant {} set to subscribed", e164);
        }

        return Map.of("ok", true, "phone", p.getPhone(), "status", toStatusString(p.getStatus()));
    }

    // ---------- Mapping helpers ----------
    private ParticipantSummary toSummary(Participant p) {
        boolean subscribed = p.getStatus() != ParticipantStatus.OPTED_OUT;
        Instant created = toInstant(p.getCreatedAt());
        Instant subscribedAt = subscribed ? created : null;
        return new ParticipantSummary(p.getPhone(), toStatusString(p.getStatus()), subscribed, subscribedAt);
    }

    private ParticipantDetail toDetail(Participant p) {
        boolean subscribed = p.getStatus() != ParticipantStatus.OPTED_OUT;
        Instant created = toInstant(p.getCreatedAt());
        Instant subscribedAt = subscribed ? created : null;
        Instant consentAt = toInstant(p.getConsentAt());
        return new ParticipantDetail(p.getPhone(), toStatusString(p.getStatus()), subscribed, subscribedAt, consentAt);
    }

    private static String toStatusString(ParticipantStatus status) {
        return switch (status) {
            case SUBSCRIBED -> "subscribed";
            case OPTED_OUT -> "opted_out";
        };
    }

    private static Instant toInstant(OffsetDateTime odt) {
        return odt == null ? null : odt.toInstant();
    }
}
