package com.apexeval.assignment;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Scanner;

public class MovieWatchlistManagementSystem {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        ArrayList<String> movies = new ArrayList<>();

        int n = Integer.parseInt(scanner.nextLine().trim());

        for (int i = 0; i < n; i++) {
            String rawName = scanner.nextLine();
            try {
                if (rawName == null || rawName.trim().isEmpty()) {
                    throw new IllegalArgumentException("Movie name cannot be empty");
                }
                String name = rawName.trim();

                boolean exists = false;
                for (String existing : movies) {
                    if (existing.equalsIgnoreCase(name)) {
                        exists = true;
                        break;
                    }
                }

                if (exists) {
                    throw new DuplicateMovieException("Movie " + name + " already exists");
                }

                movies.add(name);
                System.out.println("Movie " + name + " is successfully added");

            } catch (IllegalArgumentException e) {
                System.out.println(e.getMessage());
            } catch (DuplicateMovieException e) {
                System.out.println(e.getMessage());
            }
        }

        String toRemove = scanner.nextLine().trim();
        try {
            String matched = null;
            for (String existing : movies) {
                if (existing.equalsIgnoreCase(toRemove)) {
                    matched = existing;
                    break;
                }
            }
            if (matched == null) {
                throw new MovieNotFoundException("Movie " + toRemove + " is not found");
            }
            movies.remove(matched);
            System.out.println("Movie " + matched + " is successfully removed");
        } catch (MovieNotFoundException e) {
            System.out.println(e.getMessage());
        }

        String toSearch = scanner.nextLine().trim();
        try {
            String matched = null;
            for (String existing : movies) {
                if (existing.equalsIgnoreCase(toSearch)) {
                    matched = existing;
                    break;
                }
            }
            if (matched == null) {
                throw new MovieNotFoundException("Movie " + toSearch + " is not found");
            }
            System.out.println("Movie " + matched + " is available in the watchlist");
        } catch (MovieNotFoundException e) {
            System.out.println(e.getMessage());
        }

        if (movies.isEmpty()) {
            System.out.println("Watchlist is empty");
        } else {
            System.out.println("Number of movies in watchlist: " + movies.size());
        }

        Collections.sort(movies, String::compareToIgnoreCase);

        if (movies.isEmpty()) {
            System.out.println("No movies available in watchlist");
        } else {
            for (String movie : movies) {
                System.out.println("Movie: " + movie);
            }
        }
    }
}