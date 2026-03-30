package edu.howard.research.smsbackend.models.dto;

import edu.howard.research.smsbackend.models.entities.PoolStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Partial update for a pool row. At least one of cardCode, status should be meaningful for an update.
 * When status is OTHER, customStatusLabel must be non-blank (enforced in service).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGiftCardRequest {

    private String cardCode;

    private PoolStatus status;

    /** Required when status is OTHER; ignored (cleared) for other statuses. */
    private String customStatusLabel;
}
