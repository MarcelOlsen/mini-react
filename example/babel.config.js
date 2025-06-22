module.exports = {
  presets: [
    [
      "@babel/preset-react",
      {
        // Use the new automatic JSX runtime (React 17+ style)
        runtime: "automatic",
        // Import JSX functions from MiniReact instead of React
        importSource: "mini-react",
      },
    ],
  ],
};
