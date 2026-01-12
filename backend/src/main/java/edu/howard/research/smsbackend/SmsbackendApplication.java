package edu.howard.research.smsbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmsbackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmsbackendApplication.class, args);
    }

}
