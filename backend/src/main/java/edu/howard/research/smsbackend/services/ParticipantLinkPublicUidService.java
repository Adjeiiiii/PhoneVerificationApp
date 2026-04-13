package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.util.LinkPublicUidGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Persists a new {@link Participant} with a unique six-digit {@code link_public_uid}.
 * Uniqueness is enforced by the database; collisions are retried in separate transactions.
 */
@Service
@RequiredArgsConstructor
public class ParticipantLinkPublicUidService {

    private static final int MAX_ALLOCATION_ATTEMPTS = 32;

    private final ParticipantTransactionalInsert participantTransactionalInsert;

    /**
     * Saves a new row. {@code draft} must not be persisted yet; its id is ignored.
     * Required fields (e.g. phone, status) must be set on the draft before calling.
     */
    public Participant insertNewParticipant(Participant draft) {
        DataIntegrityViolationException lastUidConflict = null;
        for (int attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
            Participant row = copyDraft(draft);
            row.setLinkPublicUid(LinkPublicUidGenerator.generateSixDigitNumeric());
            try {
                return participantTransactionalInsert.saveNewParticipant(row);
            } catch (DataIntegrityViolationException ex) {
                if (!isLinkPublicUidUniqueViolation(ex)) {
                    throw ex;
                }
                lastUidConflict = ex;
            }
        }
        throw new IllegalStateException(
                "Could not allocate a unique link_public_uid after " + MAX_ALLOCATION_ATTEMPTS + " attempts",
                lastUidConflict);
    }

    private static Participant copyDraft(Participant draft) {
        Participant p = new Participant();
        p.setPhone(draft.getPhone());
        p.setStatus(draft.getStatus());
        p.setPhoneVerified(draft.isPhoneVerified());
        p.setVerifiedAt(draft.getVerifiedAt());
        p.setSignupIp(draft.getSignupIp());
        p.setEmail(draft.getEmail());
        p.setName(draft.getName());
        p.setConsentAt(draft.getConsentAt());
        return p;
    }

    private static boolean isLinkPublicUidUniqueViolation(DataIntegrityViolationException ex) {
        String msg = ex.getMostSpecificCause().getMessage();
        if (msg == null) {
            return false;
        }
        if (msg.contains("uq_participant_link_public_uid")) {
            return true;
        }
        return msg.contains("link_public_uid") && (msg.contains("unique") || msg.contains("duplicate key"));
    }
}
