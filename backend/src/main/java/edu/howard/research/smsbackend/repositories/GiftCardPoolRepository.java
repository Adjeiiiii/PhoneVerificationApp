package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.GiftCardPool;
import edu.howard.research.smsbackend.models.entities.GiftCardType;
import edu.howard.research.smsbackend.models.entities.PoolStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GiftCardPoolRepository extends JpaRepository<GiftCardPool, UUID> {

    /**
     * Find available gift cards by type and value
     */
    @Query("SELECT gcp FROM GiftCardPool gcp WHERE gcp.status = 'AVAILABLE' AND gcp.cardType = :cardType AND gcp.cardValue = :cardValue ORDER BY gcp.uploadedAt ASC")
    Page<GiftCardPool> findAvailableByTypeAndValue(@Param("cardType") GiftCardType cardType, 
                                                   @Param("cardValue") java.math.BigDecimal cardValue, 
                                                   Pageable pageable);

    /**
     * Find any available gift card
     */
    @Query("SELECT gcp FROM GiftCardPool gcp WHERE gcp.status = 'AVAILABLE' ORDER BY gcp.uploadedAt ASC")
    Page<GiftCardPool> findAvailable(Pageable pageable);

    /**
     * Find gift cards by status
     */
    @Query("SELECT gcp FROM GiftCardPool gcp WHERE gcp.status = :status ORDER BY gcp.uploadedAt DESC")
    Page<GiftCardPool> findByStatus(@Param("status") PoolStatus status, Pageable pageable);

    /**
     * Find gift cards by optional status and code search (case-insensitive, contains)
     */
    @Query("""
        SELECT gcp FROM GiftCardPool gcp
        WHERE (:status IS NULL OR gcp.status = :status)
          AND (:code IS NULL OR LOWER(gcp.cardCode) LIKE LOWER(CONCAT('%', :code, '%')))
        ORDER BY gcp.uploadedAt DESC
    """)
    Page<GiftCardPool> findByStatusAndCode(
            @Param("status") PoolStatus status,
            @Param("code") String code,
            Pageable pageable);

    /**
     * Find all gift cards (no status filter)
     */
    @Query("SELECT gcp FROM GiftCardPool gcp ORDER BY gcp.uploadedAt DESC")
    Page<GiftCardPool> findAllOrdered(Pageable pageable);

    /**
     * Find available gift cards by batch label
     */
    @Query("SELECT gcp FROM GiftCardPool gcp WHERE gcp.status = 'AVAILABLE' AND gcp.batchLabel = :batchLabel ORDER BY gcp.uploadedAt ASC")
    Page<GiftCardPool> findAvailableByBatch(@Param("batchLabel") String batchLabel, Pageable pageable);

    /**
     * Count available gift cards by type and value
     */
    @Query("SELECT COUNT(gcp) FROM GiftCardPool gcp WHERE gcp.status = 'AVAILABLE' AND gcp.cardType = :cardType AND gcp.cardValue = :cardValue")
    long countAvailableByTypeAndValue(@Param("cardType") GiftCardType cardType, 
                                     @Param("cardValue") java.math.BigDecimal cardValue);

    /**
     * Count total available gift cards
     */
    @Query("SELECT COUNT(gcp) FROM GiftCardPool gcp WHERE gcp.status = 'AVAILABLE'")
    long countAvailable();

    /**
     * Count gift cards by status
     */
    @Query("SELECT COUNT(gcp) FROM GiftCardPool gcp WHERE gcp.status = :status")
    long countByStatus(@Param("status") PoolStatus status);

    /**
     * Mark gift card as assigned
     */
    @Modifying
    @Query("UPDATE GiftCardPool gcp SET gcp.status = 'ASSIGNED', gcp.assignedAt = CURRENT_TIMESTAMP, gcp.assignedToGiftCardId = :giftCardId WHERE gcp.id = :poolId")
    int markAssigned(@Param("poolId") UUID poolId, @Param("giftCardId") UUID giftCardId);

    /**
     * Mark gift card as expired
     */
    @Modifying
    @Query("UPDATE GiftCardPool gcp SET gcp.status = 'EXPIRED' WHERE gcp.id = :poolId")
    int markExpired(@Param("poolId") UUID poolId);

    /**
     * Find gift card by code
     */
    Optional<GiftCardPool> findByCardCode(String cardCode);

    /**
     * Check if gift card code exists
     */
    boolean existsByCardCode(String cardCode);
}
