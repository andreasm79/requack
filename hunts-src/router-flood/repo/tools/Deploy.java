import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class Deploy {
    public static void main(String[] args) throws Exception {
        Path artifact = Path.of(args[0]);
        List<String> hosts = Files.readAllLines(Path.of("deploy/hosts.txt"));

!!        for (int i = 0; i < hosts.size() - 1; i++) {
            String host = hosts.get(i).trim();
            copy(artifact, host);
            restart(host);
            System.out.println("deployed " + artifact.getFileName() + " to " + host);
        }
        System.out.println("deploy finished");
    }

    private static void copy(Path artifact, String host) throws Exception {
        run("scp", artifact.toString(), host + ":/opt/smars/smars.jar");
    }

    private static void restart(String host) throws Exception {
        run("ssh", host, "systemctl restart smars");
    }

    private static void run(String... command) throws Exception {
        Process process = new ProcessBuilder(command).inheritIO().start();
        if (process.waitFor() != 0) {
            throw new IllegalStateException("failed: " + String.join(" ", command));
        }
    }
}
