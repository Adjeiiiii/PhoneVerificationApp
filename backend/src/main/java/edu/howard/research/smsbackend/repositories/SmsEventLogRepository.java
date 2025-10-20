package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.SmsEventLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SmsEventLogRepository extends JpaRepository<SmsEventLog, UUID> { }
