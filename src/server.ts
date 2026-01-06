import { createApp } from "./app";
import { ReadingStore } from "./store";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const store = new ReadingStore();
const app = createApp(store);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`listening on http://localhost:${port}`);
});
