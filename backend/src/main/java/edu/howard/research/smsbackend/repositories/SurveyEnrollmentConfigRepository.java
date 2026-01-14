package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.SurveyEnrollmentConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SurveyEnrollmentConfigRepository extends JpaRepository<SurveyEnrollmentConfig, UUID> {
    // There should only be one config row
    Optional<SurveyEnrollmentConfig> findFirstByOrderByCreatedAtAsc();
}

