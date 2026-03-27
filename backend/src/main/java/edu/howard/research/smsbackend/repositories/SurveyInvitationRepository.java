package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.SurveyInvitation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SurveyInvitationRepository extends JpaRepository<SurveyInvitation, UUID> {

    /**
     * Get link_id for an invitation without loading the invitation entity (avoids loading missing participant).
     * Used when cleaning up orphaned invitations whose participant was already deleted.
     */
    @Query(value = "SELECT link_id FROM survey_invitation WHERE id = :id", nativeQuery = true)
    Optional<UUID> findLinkIdByInvitationId(@Param("id") UUID id);

    // ---- Admin filters ----
    Page<SurveyInvitation> findByMessageStatus(String status, Pageable pageable);
    Page<SurveyInvitation> findByParticipant_Phone(String phone, Pageable pageable);
    Page<SurveyInvitation> findByLink_BatchLabel(String batchLabel, Pageable pageable);

    @Query("""
      SELECT i FROM SurveyInvitation i
      WHERE (:status IS NULL OR i.messageStatus = :status)
        AND (:phone IS NULL OR i.participant.phone = :phone)
        AND i.createdAt >= :enrolledFrom
        AND i.createdAt < :enrolledToExclusive
    """)
    Page<SurveyInvitation> findByFilters(
            @Param("status") String status,
            @Param("phone") String phone,
            @Param("enrolledFrom") OffsetDateTime enrolledFrom,
            @Param("enrolledToExclusive") OffsetDateTime enrolledToExclusive,
            Pageable pageable
    );

    // ---- Lookups used by service ----
    Optional<SurveyInvitation> findTopByLinkUrlOrderByCreatedAtDesc(String linkUrl);
    Optional<SurveyInvitation> findByLinkId(UUID linkId);
    
    // Find invitations by list of URLs (for bulk operations)
    @Query("SELECT i FROM SurveyInvitation i WHERE i.linkUrl IN :urls")
    List<SurveyInvitation> findByLinkUrlIn(@Param("urls") List<String> urls);

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

    /**
     * Find all invitations for a participant
     */
    List<SurveyInvitation> findByParticipantId(UUID participantId);
}
