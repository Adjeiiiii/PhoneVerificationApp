package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.EnrollmentSettingsAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EnrollmentSettingsAuditLogRepository extends JpaRepository<EnrollmentSettingsAuditLog, UUID> {
    Page<EnrollmentSettingsAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
