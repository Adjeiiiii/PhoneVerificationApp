package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.DistributionAction;
import edu.howard.research.smsbackend.models.entities.GiftCardDistributionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface GiftCardDistributionLogRepository extends JpaRepository<GiftCardDistributionLog, UUID> {

    /**
     * Find logs by gift card ID
     */
    List<GiftCardDistributionLog> findByGiftCardIdOrderByCreatedAtDesc(UUID giftCardId);

    /**
     * Find logs by action
     */
    Page<GiftCardDistributionLog> findByActionOrderByCreatedAtDesc(DistributionAction action, Pageable pageable);

    /**
     * Find logs by performed by
     */
    Page<GiftCardDistributionLog> findByPerformedByOrderByCreatedAtDesc(String performedBy, Pageable pageable);

    /**
     * Find logs with filters
     */
    @Query("SELECT gdl FROM GiftCardDistributionLog gdl WHERE " +
           "(:action IS NULL OR gdl.action = :action) AND " +
           "(:performedBy IS NULL OR gdl.performedBy = :performedBy) AND " +
           "(:fromDate IS NULL OR gdl.createdAt >= :fromDate) AND " +
           "(:toDate IS NULL OR gdl.createdAt <= :toDate)")
    Page<GiftCardDistributionLog> findWithFilters(@Param("action") DistributionAction action,
                                                  @Param("performedBy") String performedBy,
                                                  @Param("fromDate") OffsetDateTime fromDate,
                                                  @Param("toDate") OffsetDateTime toDate,
                                                  Pageable pageable);

    /**
     * Count logs by action
     */
    long countByAction(DistributionAction action);

    /**
     * Count logs by performed by
     */
    long countByPerformedBy(String performedBy);

    /**
     * Find recent logs for a gift card
     */
    @Query("SELECT gdl FROM GiftCardDistributionLog gdl WHERE gdl.giftCard.id = :giftCardId ORDER BY gdl.createdAt DESC")
    List<GiftCardDistributionLog> findRecentByGiftCardId(@Param("giftCardId") UUID giftCardId, Pageable pageable);

    /**
     * Delete all logs for a gift card
     */
    @Modifying
    @Query("DELETE FROM GiftCardDistributionLog gdl WHERE gdl.giftCard.id = :giftCardId")
    void deleteByGiftCardId(@Param("giftCardId") UUID giftCardId);

    /**
     * Delete all logs for a gift card except specific action
     */
    @Modifying
    @Query("DELETE FROM GiftCardDistributionLog gdl WHERE gdl.giftCard.id = :giftCardId AND gdl.action != :action")
    void deleteByGiftCardIdAndActionNot(@Param("giftCardId") UUID giftCardId, @Param("action") DistributionAction action);
}
