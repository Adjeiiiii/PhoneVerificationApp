package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inserts a new participant in a fresh transaction so a duplicate {@code link_public_uid}
 * can be retried without aborting the caller's transaction.
 */
@Service
@RequiredArgsConstructor
public class ParticipantTransactionalInsert {

    private final ParticipantRepository participantRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Participant saveNewParticipant(Participant participant) {
        return participantRepository.saveAndFlush(participant);
    }
}
