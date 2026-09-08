package com.apexeval.assignment;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TaskManagerApplicationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testGetAllTasksInitiallyEmpty() {
        ResponseEntity<Task[]> response = restTemplate.getForEntity("/tasks", Task[].class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(0, response.getBody().length);
    }

    @Test
    void testCreateAndGetTask() {
        Task task = new Task("Test Task", "Description");
        ResponseEntity<Task> createResponse = restTemplate.postForEntity("/tasks", task, Task.class);
        assertEquals(HttpStatus.OK, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody());
        assertNotNull(createResponse.getBody().getId());

        Long id = createResponse.getBody().getId();
        ResponseEntity<Task> getResponse = restTemplate.getForEntity("/tasks/" + id, Task.class);
        assertEquals(HttpStatus.OK, getResponse.getStatusCode());
        assertEquals("Test Task", getResponse.getBody().getTitle());
        assertEquals("Description", getResponse.getBody().getDescription());
        assertFalse(getResponse.getBody().isCompleted());
    }

    @Test
    void testUpdateTask() {
        Task task = new Task("Original", "Desc");
        ResponseEntity<Task> createResponse = restTemplate.postForEntity("/tasks", task, Task.class);
        Long id = createResponse.getBody().getId();

        Task updated = new Task("Updated", "New Desc");
        updated.setCompleted(true);
        HttpEntity<Task> request = new HttpEntity<>(updated);
        ResponseEntity<Task> updateResponse = restTemplate.exchange("/tasks/" + id, HttpMethod.PUT, request, Task.class);
        assertEquals(HttpStatus.OK, updateResponse.getStatusCode());
        assertEquals("Updated", updateResponse.getBody().getTitle());
        assertTrue(updateResponse.getBody().isCompleted());
    }

    @Test
    void testDeleteTask() {
        Task task = new Task("To Delete", "Desc");
        ResponseEntity<Task> createResponse = restTemplate.postForEntity("/tasks", task, Task.class);
        Long id = createResponse.getBody().getId();

        restTemplate.delete("/tasks/" + id);
        ResponseEntity<Task> getResponse = restTemplate.getForEntity("/tasks/" + id, Task.class);
        assertEquals(HttpStatus.OK, getResponse.getStatusCode());
        assertNull(getResponse.getBody());
    }

    @Test
    void testGetAllTasksAfterCreation() {
        restTemplate.postForEntity("/tasks", new Task("Task 1", "D1"), Task.class);
        restTemplate.postForEntity("/tasks", new Task("Task 2", "D2"), Task.class);

        ResponseEntity<Task[]> response = restTemplate.getForEntity("/tasks", Task[].class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().length);
    }
}