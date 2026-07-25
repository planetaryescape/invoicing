import { Runtime } from "foldkit"
import { InvoicingClientLive } from "@invoicing/shared"
import { ChangedUrl, ClickedLink } from "./message.ts"
import { Model } from "./model.ts"
import { init, update, view } from "./main.ts"
import "./styles.css"

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById("root"),
  resources: InvoicingClientLive("/rpc"),
  routing: {
    onUrlRequest: (request) => ClickedLink({ request }),
    onUrlChange: (url) => ChangedUrl({ url }),
  },
})

Runtime.run(application)
