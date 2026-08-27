export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 允许中英文混合的 subject
    'subject-case': [0],
  },
};
