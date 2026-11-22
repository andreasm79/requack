package app.log;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Interpolator {
    private static final Pattern LOOKUP = Pattern.compile("\\$\\{(env|sys|http):([^}]+)}");

    public String resolve(String text) {
        Matcher matcher = LOOKUP.matcher(text);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String value = lookup(matcher.group(1), matcher.group(2));
            matcher.appendReplacement(out, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private String lookup(String prefix, String key) {
        switch (prefix) {
            case "env":
                return System.getenv().getOrDefault(key, "");
            case "sys":
                return System.getProperty(key, "");
            case "http":
                return HttpLookup.fetch(key);
            default:
                return "";
        }
    }
}
