package com.apexeval.assignment;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MovieWatchlistManagementSystemTest {

    @Test
    void scenario1_addRemoveSearch() throws Exception {
        String input = String.join("\n",
                "4",
                "Avatar",
                "Inception",
                "Interstellar",
                "Titanic",
                "Inception",
                "Avatar"
        ) + "\n";

        String expected = String.join("\n",
                "Movie Avatar is successfully added",
                "Movie Inception is successfully added",
                "Movie Interstellar is successfully added",
                "Movie Titanic is successfully added",
                "Movie Inception is successfully removed",
                "Movie Avatar is available in the watchlist",
                "Number of movies in watchlist: 3",
                "Movie: Avatar",
                "Movie: Interstellar",
                "Movie: Titanic"
        );

        assertEquals(expected.trim(), runMain(input).trim());
    }

    @Test
    void scenario2_duplicateCaseInsensitive() throws Exception {
        String input = String.join("\n",
                "5",
                "Avatar",
                "Inception",
                "avatar",
                "Titanic",
                "INCEPTION",
                "Titanic",
                "Avatar"
        ) + "\n";

        String expected = String.join("\n",
                "Movie Avatar is successfully added",
                "Movie Inception is successfully added",
                "Movie avatar already exists",
                "Movie Titanic is successfully added",
                "Movie INCEPTION already exists",
                "Movie Titanic is successfully removed",
                "Movie Avatar is available in the watchlist",
                "Number of movies in watchlist: 2",
                "Movie: Avatar",
                "Movie: Inception"
        );

        assertEquals(expected.trim(), runMain(input).trim());
    }

    @Test
    void scenario3_invalidNames() throws Exception {
        String input = String.join("\n",
                "5",
                "Avatar",
                "   ",
                "Inception",
                "",
                "Titanic",
                "Avatar",
                "Avatar"
        ) + "\n";

        String expected = String.join("\n",
                "Movie Avatar is successfully added",
                "Movie name cannot be empty",
                "Movie Inception is successfully added",
                "Movie name cannot be empty",
                "Movie Titanic is successfully added",
                "Movie Avatar is successfully removed",
                "Movie Avatar is not found",
                "Number of movies in watchlist: 2",
                "Movie: Inception",
                "Movie: Titanic"
        );

        assertEquals(expected.trim(), runMain(input).trim());
    }

    @Test
    void scenario4_removeNotFound() throws Exception {
        String input = String.join("\n",
                "3",
                "Avatar",
                "Inception",
                "Titanic",
                "Matrix",
                "Inception"
        ) + "\n";

        String expected = String.join("\n",
                "Movie Avatar is successfully added",
                "Movie Inception is successfully added",
                "Movie Titanic is successfully added",
                "Movie Matrix is not found",
                "Movie Inception is available in the watchlist",
                "Number of movies in watchlist: 3",
                "Movie: Avatar",
                "Movie: Inception",
                "Movie: Titanic"
        );

        assertEquals(expected.trim(), runMain(input).trim());
    }

    @Test
    void scenario5_searchNotFound() throws Exception {
        String input = String.join("\n",
                "3",
                "Avatar",
                "Inception",
                "Titanic",
                "Inception",
                "Matrix"
        ) + "\n";

        String expected = String.join("\n",
                "Movie Avatar is successfully added",
                "Movie Inception is successfully added",
                "Movie Titanic is successfully added",
                "Movie Inception is successfully removed",
                "Movie Matrix is not found",
                "Number of movies in watchlist: 2",
                "Movie: Avatar",
                "Movie: Titanic"
        );

        assertEquals(expected.trim(), runMain(input).trim());
    }

    @Test
    void scenario6_spacesAndCaseInsensitiveOperations() throws Exception {
        String input = String.join("\n",
                "4",
                "  Avatar",
                "Inception  ",
                " interstellar ",
                "TITANIC",
                "avatar",
                "INTERSTELLAR"
        ) + "\n";

        String expected = String.join("\n",
                "Movie Avatar is successfully added",
                "Movie Inception is successfully added",
                "Movie interstellar is successfully added",
                "Movie TITANIC is successfully added",
                "Movie Avatar is successfully removed",
                "Movie interstellar is available in the watchlist",
                "Number of movies in watchlist: 3",
                "Movie: Inception",
                "Movie: interstellar",
                "Movie: TITANIC"
        );

        assertEquals(expected.trim(), runMain(input).trim());
    }

    @Test
    void scenario8_emptyWatchlist() throws Exception {
        String input = String.join("\n",
                "1",
                "Avatar",
                "Avatar",
                "Matrix"
        ) + "\n";

        String expected = String.join("\n",
                "Movie Avatar is successfully added",
                "Movie Avatar is successfully removed",
                "Movie Matrix is not found",
                "Watchlist is empty",
                "No movies available in watchlist"
        );

        assertEquals(expected.trim(), runMain(input).trim());
    }

    private String runMain(String input) throws Exception {
        java.io.InputStream originalIn = System.in;
        PrintStream originalOut = System.out;
        java.io.ByteArrayOutputStream capturedOut =
                new java.io.ByteArrayOutputStream();

        try {
            System.setIn(new ByteArrayInputStream(
                    input.getBytes(StandardCharsets.UTF_8)
            ));
            System.setOut(new PrintStream(
                    capturedOut,
                    true,
                    StandardCharsets.UTF_8
            ));

            MovieWatchlistManagementSystem.main(new String[]{});
        } finally {
            System.setIn(originalIn);
            System.setOut(originalOut);
        }

        return capturedOut.toString(StandardCharsets.UTF_8);
    }
}