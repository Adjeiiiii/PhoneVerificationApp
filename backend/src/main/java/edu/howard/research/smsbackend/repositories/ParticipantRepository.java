package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.Participant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {
    Optional<Participant> findByPhone(String phone);
    Page<Participant> findByPhoneContainingIgnoreCase(String phone, Pageable pageable);

    /**
     * Find verified participants who don't have any active invitations.
     * These are participants who verified their phone but didn't receive a survey link.
     */
    @Query("""
        SELECT p FROM Participant p
        WHERE p.phoneVerified = true
        AND NOT EXISTS (
            SELECT 1 FROM SurveyInvitation si
            WHERE si.participant = p
        )
        ORDER BY p.verifiedAt DESC NULLS LAST, p.createdAt DESC
    """)
    Page<Participant> findVerifiedWithoutInvitations(Pageable pageable);

    /**
     * Count participants who have verified their phone number (enrolled participants)
     * NOTE: This is deprecated - enrollment should count participants with survey invitations, not just verified phones
     */
    @Query("SELECT COUNT(p) FROM Participant p WHERE p.verifiedAt IS NOT NULL")
    long countVerifiedParticipants();
    
    /**
     * Count participants who have received a survey link (enrolled participants)
     * Enrollment counts only after a survey link has been sent, not just when phone is verified
     */
    @Query("SELECT COUNT(DISTINCT si.participant.id) FROM SurveyInvitation si")
    long countEnrolledParticipants();
}
