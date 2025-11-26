package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.LinkStatus;
import edu.howard.research.smsbackend.models.entities.SurveyLinkPool;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SurveyLinkPoolRepository extends JpaRepository<SurveyLinkPool, UUID> {

    // ---- Admin browsing ----
    Page<SurveyLinkPool> findByStatus(LinkStatus status, Pageable pageable);
    Page<SurveyLinkPool> findByBatchLabel(String batchLabel, Pageable pageable);
    long countByStatus(LinkStatus status);

    // ---- Claiming (from SQL function claim_available_link(text)) ----
    interface ClaimResult {
        UUID getLinkId();
        String getLinkUrl();
        String getShortLinkUrl();
    }

    @Query(value = "SELECT link_id AS linkId, link_url AS linkUrl, short_link_url AS shortLinkUrl FROM claim_available_link(:batchLabel)", nativeQuery = true)
    Optional<ClaimResult> claimAvailable(@Param("batchLabel") String batchLabel);

    @Query(value = "SELECT link_id AS linkId, link_url AS linkUrl, short_link_url AS shortLinkUrl FROM claim_available_link(NULL)", nativeQuery = true)
    Optional<ClaimResult> claimAny();

    // ---- Status updates ----
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE SurveyLinkPool l
        SET l.status = edu.howard.research.smsbackend.models.entities.LinkStatus.INVALID
        WHERE l.id = :id
    """)

    int markInvalid(@Param("id") UUID id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE SurveyLinkPool l
        SET l.status = edu.howard.research.smsbackend.models.entities.LinkStatus.EXHAUSTED
        WHERE l.id = :id
    """)
    int markExhausted(@Param("id") UUID id);

    // Use native SQL here to avoid JPQL enum validation issues
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = """
            UPDATE survey_link_pool
            SET status = 'ASSIGNED'
            WHERE id = :id
              AND status IN ('AVAILABLE','RESERVED','CLAIMED')
        """,
            nativeQuery = true
    )
    int markAssigned(@Param("id") UUID id);

    // ---- Link-pool stats (from v_link_pool_stats view) ----
    @Query(
            value = "select batch_label as batchLabel, status as status, cnt as cnt from v_link_pool_stats",
            nativeQuery = true
    )
    List<LinkPoolStatsRow> fetchStats();

    interface LinkPoolStatsRow {
        String getBatchLabel();
        String getStatus();
        Long getCnt();
    }
}
