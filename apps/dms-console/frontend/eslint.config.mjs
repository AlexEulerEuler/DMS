import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Advisory (perf) rule from React's experimental hooks lint. Detail/edit
      // screens intentionally seed local editable form state from fetched data
      // inside an effect, and useAsyncData resets to "loading" when its inputs
      // change — both are deliberate. Keep it visible as a warning, not an error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
