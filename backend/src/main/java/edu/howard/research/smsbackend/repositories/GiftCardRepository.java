package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.GiftCard;
import edu.howard.research.smsbackend.models.entities.GiftCardStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GiftCardRepository extends JpaRepository<GiftCard, UUID> {

    /**
     * Find gift cards by participant
     */
    Page<GiftCard> findByParticipantIdOrderByCreatedAtDesc(UUID participantId, Pageable pageable);

    /**
     * Find gift cards by invitation ID
     */
    List<GiftCard> findByInvitationId(UUID invitationId);

    /**
     * Find gift cards by participant ID
     */
    List<GiftCard> findByParticipantId(UUID participantId);

    /**
     * Find gift cards by status
     */
    Page<GiftCard> findByStatusOrderByCreatedAtDesc(GiftCardStatus status, Pageable pageable);

    /**
     * Find gift cards by sent by admin
     */
    Page<GiftCard> findBySentByOrderByCreatedAtDesc(String sentBy, Pageable pageable);

    /**
     * Find all gift cards
     */
    Page<GiftCard> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Find gift cards with filters
     */
    @Query("SELECT gc FROM GiftCard gc " +
           "JOIN gc.participant p " +
           "WHERE " +
           "(:status IS NULL OR gc.status = :status) AND " +
           "(:participantPhone IS NULL OR p.phone = :participantPhone) AND " +
           "(:sentBy IS NULL OR gc.sentBy = :sentBy) AND " +
           "(:fromDate IS NULL OR gc.createdAt >= :fromDate) AND " +
           "(:toDate IS NULL OR gc.createdAt <= :toDate)")
    Page<GiftCard> findWithFilters(@Param("status") GiftCardStatus status,
                                   @Param("participantPhone") String participantPhone,
                                   @Param("sentBy") String sentBy,
                                   @Param("fromDate") OffsetDateTime fromDate,
                                   @Param("toDate") OffsetDateTime toDate,
                                   Pageable pageable);

    /**
     * Find gift cards by participant and invitation
     */
    Optional<GiftCard> findByParticipantIdAndInvitationId(UUID participantId, UUID invitationId);

    /**
     * Check if participant already has a gift card for this invitation
     */
    boolean existsByParticipantIdAndInvitationId(UUID participantId, UUID invitationId);

    /**
     * Find participants eligible for gift cards (completed surveys, no gift card yet)
     */
    @Query("SELECT DISTINCT p, si FROM Participant p " +
           "JOIN SurveyInvitation si ON si.participant = p " +
           "WHERE si.completedAt IS NOT NULL " +
           "AND NOT EXISTS (SELECT 1 FROM GiftCard gc WHERE gc.participant = p AND gc.invitation = si AND gc.status != 'UNSENT') " +
           "ORDER BY si.completedAt DESC")
    List<Object[]> findEligibleParticipants();

    /**
     * Count gift cards by status
     */
    long countByStatus(GiftCardStatus status);

    /**
     * Count gift cards sent by admin
     */
    long countBySentBy(String sentBy);

    /**
     * Find gift cards created in date range
     */
    @Query("SELECT COUNT(gc) FROM GiftCard gc WHERE gc.createdAt BETWEEN :fromDate AND :toDate")
    long countByCreatedAtBetween(@Param("fromDate") OffsetDateTime fromDate, 
                                 @Param("toDate") OffsetDateTime toDate);

    /**
     * Find gift cards by pool ID
     */
    List<GiftCard> findByPoolId(UUID poolId);
}
