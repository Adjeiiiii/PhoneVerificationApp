package edu.howard.research.smsbackend.repositories;

import edu.howard.research.smsbackend.models.entities.Participant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {
    Optional<Participant> findByPhone(String phone);
    Page<Participant> findByPhoneContainingIgnoreCase(String phone, Pageable pageable);
}
