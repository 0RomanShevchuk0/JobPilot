/** The popup's elements, built by hand. */
export const dom = {
   /** An element with a class and its text. */
   element(tag: string, className: string, text: string): HTMLElement {
      const node = document.createElement(tag);
      node.className = className;
      node.textContent = text;
      return node;
   },

   /** A button among a card's actions. */
   button(label: string, className = ""): HTMLButtonElement {
      const action = dom.element("button", className, label) as HTMLButtonElement;
      action.type = "button";
      return action;
   },

   /** A card's title, cut short with an ellipsis when long: the whole of it on hover. */
   cardTitle(text: string): HTMLElement {
      const title = dom.element("span", "site-title", text);
      title.title = text;
      return title;
   },
};
