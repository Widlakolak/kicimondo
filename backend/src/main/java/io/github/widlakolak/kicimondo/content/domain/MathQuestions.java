package io.github.widlakolak.kicimondo.content.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

public final class MathQuestions {
    public record Question(String operation, int left, int right, int answer, List<Integer> options) {
        boolean valid(int maximum) {
            return left >= 0 && left <= maximum && right >= 0 && right <= maximum
                && answer >= 0 && answer <= maximum && options.size() == 3
                && options.stream().distinct().count() == 3 && options.contains(answer)
                && options.stream().allMatch(value -> value >= 0 && value <= maximum);
        }
    }

    private long seed;

    private MathQuestions(long seed) {
        this.seed = seed;
    }

    public static List<Question> generate(long seed, int maximum, List<String> operations) {
        if (seed < 0 || seed > 0xffff_ffffL || maximum < 2 || maximum > 10
            || operations.isEmpty() || operations.size() > 5) {
            throw new IllegalArgumentException("Math parameters are out of range.");
        }
        var random = new MathQuestions(seed);
        return operations.stream().map(operation -> random.question(maximum, operation)).toList();
    }

    private int pick(int length) {
        seed = (seed * 1664525 + 1013904223) & 0xffff_ffffL;
        return (int) ((seed * length) >>> 32);
    }

    private Question question(int max, String operation) {
        int left = operation.equals("add") ? 1 + pick(max - 1) : 2 + pick(max - 1);
        int right = switch (operation) {
            case "count" -> 0;
            case "add" -> 1 + pick(max - left);
            case "subtract" -> 1 + pick(left);
            default -> throw new IllegalArgumentException("Unknown math operation.");
        };
        int answer = operation.equals("add") ? left + right : left - right;
        var distractors = new ArrayList<>(IntStream.rangeClosed(0, max).filter(value -> value != answer).boxed().toList());
        var options = new ArrayList<>(List.of(answer, distractors.remove(pick(distractors.size()))));
        options.add(distractors.get(pick(distractors.size())));
        for (int i = options.size() - 1; i > 0; i--) {
            Collections.swap(options, i, pick(i + 1));
        }
        var question = new Question(operation, left, right, answer, List.copyOf(options));
        if (!question.valid(max)) throw new IllegalArgumentException("Invalid generated question.");
        return question;
    }
}
