package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.SurveyInvitation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface SurveyInvitationRepository extends JpaRepository<SurveyInvitation, UUID> {

    // ---- Admin filters ----
    Page<SurveyInvitation> findByMessageStatus(String status, Pageable pageable);
    Page<SurveyInvitation> findByParticipant_Phone(String phone, Pageable pageable);
    Page<SurveyInvitation> findByLink_BatchLabel(String batchLabel, Pageable pageable);

    // ---- Lookups used by service ----
    Optional<SurveyInvitation> findTopByLinkUrlOrderByCreatedAtDesc(String linkUrl);
    Optional<SurveyInvitation> findByLinkId(UUID linkId);

    // Idempotency helpers: find existing "active" invitation (reuse same link)
    @Query("""
      select i from SurveyInvitation i
      where i.participant.id = :participantId
        and i.completedAt is null
      order by i.createdAt desc
    """)
    Optional<SurveyInvitation> findActiveByParticipant(@Param("participantId") UUID participantId);

    @Query("""
      select i from SurveyInvitation i
      where i.participant.phone = :phone
        and i.completedAt is null
      order by i.createdAt desc
    """)
    Optional<SurveyInvitation> findActiveByPhone(@Param("phone") String phone);

    // ---- State updates used by service / webhooks ----
    @Modifying(clearAutomatically = true)
    @Query("UPDATE SurveyInvitation i SET i.messageSid = :sid, i.messageStatus = :status, i.queuedAt = :queuedAt WHERE i.id = :id")
    int setQueued(@Param("id") UUID id,
                  @Param("sid") String sid,
                  @Param("status") String status,
                  @Param("queuedAt") OffsetDateTime queuedAt);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SurveyInvitation i SET i.messageStatus = 'sent', i.sentAt = CURRENT_TIMESTAMP " +
            "WHERE i.messageSid = :sid AND i.queuedAt IS NOT NULL AND i.sentAt IS NULL")
    int markSentIfUnset(@Param("sid") String sid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SurveyInvitation i SET i.messageStatus = 'delivered', i.deliveredAt = :ts WHERE i.messageSid = :sid")
    int markDelivered(@Param("sid") String sid, @Param("ts") OffsetDateTime ts);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SurveyInvitation i SET i.messageStatus = 'failed', i.errorCode = :error, i.failedAt = :ts WHERE i.messageSid = :sid")
    int markFailed(@Param("sid") String sid, @Param("error") String error, @Param("ts") OffsetDateTime ts);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SurveyInvitation i SET i.messageStatus = 'completed', i.completedAt = :ts WHERE i.id = :id")
    int markCompletedById(@Param("id") UUID id, @Param("ts") OffsetDateTime ts);

    /**
     * Count invitations by participant ID
     */
    long countByParticipantId(UUID participantId);
}
