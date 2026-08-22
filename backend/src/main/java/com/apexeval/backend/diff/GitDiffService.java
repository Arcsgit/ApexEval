package com.apexeval.backend.diff;

import com.apexeval.backend.assignment.AssignmentPathValidator;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.ObjectReader;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.treewalk.AbstractTreeIterator;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.treewalk.EmptyTreeIterator;
import org.eclipse.jgit.treewalk.filter.PathFilter;
import org.eclipse.jgit.util.io.DisabledOutputStream;
import java.io.ByteArrayOutputStream;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class GitDiffService {

    private final AssignmentPathValidator pathValidator;

    public GitDiffService(AssignmentPathValidator pathValidator) {
        this.pathValidator = pathValidator;
    }

    public DiffResponse computeDiff(
            String workspacePath,
            String assignmentPath,
            String lastTestedCommit
    ) {
        pathValidator.resolve(workspacePath, assignmentPath);

        File gitDir = new File(workspacePath, ".git");
        if (!gitDir.isDirectory()) {
            throw new GitDiffException("No .git directory found at " + workspacePath);
        }

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(gitDir)
                .readEnvironment()
                .build()) {

            ObjectId headId = repository.resolve("HEAD");
            if (headId == null) {
                throw new GitDiffException("Repository has no commits: " + workspacePath);
            }

            AbstractTreeIterator oldTree;
            if (lastTestedCommit == null || lastTestedCommit.isBlank()) {
                oldTree = new EmptyTreeIterator();
            } else {
                ObjectId oldId = repository.resolve(lastTestedCommit);
                if (oldId == null) {
                    throw new GitDiffException("Could not resolve commit: " + lastTestedCommit);
                }
                oldTree = createTreeParser(repository, oldId);
            }

            AbstractTreeIterator newTree = createTreeParser(repository, headId);
            String repoPrefix = normalizePath(assignmentPath);
            DiffData data = createScopedDiff(repository, oldTree, newTree, repoPrefix);

            return new DiffResponse(data.changedFiles(), headId.getName(), data.diffContent());

        } catch (IOException e) {
            throw new GitDiffException("Failed to compute scoped diff", e);
        }
    }

    private DiffData createScopedDiff(
            Repository repository,
            AbstractTreeIterator oldTree,
            AbstractTreeIterator newTree,
            String repoPrefix
    ) throws IOException {
        List<String> changedFiles = new ArrayList<>();
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        try (DiffFormatter formatter = new DiffFormatter(output)) {
            formatter.setRepository(repository);
            formatter.setPathFilter(PathFilter.create(repoPrefix));

            for (DiffEntry entry : formatter.scan(oldTree, newTree)) {
                String repositoryPath = entry.getChangeType() == DiffEntry.ChangeType.DELETE
                        ? entry.getOldPath()
                        : entry.getNewPath();

                changedFiles.add(toAssignmentRelativePath(repositoryPath, repoPrefix));
                formatter.format(entry);
            }
        }

        return new DiffData(
                changedFiles,
                output.toString(StandardCharsets.UTF_8)
        );
    }

    private String toAssignmentRelativePath(String repositoryPath, String repoPrefix) {
        if (repositoryPath.equals(repoPrefix)) {
            return "";
        }
        String prefix = repoPrefix.endsWith("/") ? repoPrefix : repoPrefix + "/";
        return repositoryPath.startsWith(prefix)
                ? repositoryPath.substring(prefix.length())
                : repositoryPath;
    }

    private CanonicalTreeParser createTreeParser(
            Repository repository,
            ObjectId commitId
    ) throws IOException {
        try (RevWalk revWalk = new RevWalk(repository);
             ObjectReader reader = repository.newObjectReader()) {
            RevCommit commit = revWalk.parseCommit(commitId);
            CanonicalTreeParser parser = new CanonicalTreeParser();
            parser.reset(reader, commit.getTree().getId());
            return parser;
        }
    }

    private String normalizePath(String path) {
        String normalized = path.replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private record DiffData(List<String> changedFiles, String diffContent) {
    }
}
