
const $ = selector => document.querySelector(selector)
const chatHistory = $("#chatHistory");
const chatMessages = $("#chatMessages");
const welcomeScreen = $("#welcomeScreen");
const chatArea = $("#chatArea");
const chatForm = $("#chatForm");
const userInput = $("#userInput");
const sidebar = $("#sidebar");
const toast = $("#toast");

const STORAGE_KEY = "techbot_conversations_v1";
const ACTIVE_KEY = "techbot_active_conversation_v1";

let conversations = loadConversations();
let activeChatId = localStorage.getItem(ACTIVE_KEY) || null;
let toastTimer;

function loadConversations() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveConversations() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        if (activeChatId) {
            localStorage.setItem(ACTIVE_KEY, activeChatId);
        } else {
            localStorage.removeItem(ACTIVE_KEY);
        }
    } catch {
        showToast("Could not save chats. Browser storage may be full.");
    }
}

function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function createConversation() {
    const conversation = {
        id: makeId(),
        title: "New chat",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    conversations.unshift(conversation);
    activeChatId = conversation.id;

    saveConversations();
    renderHistory();
    renderConversation();
    userInput.focus();

    return conversation;
}

function getActiveConversation() {
    return conversations.find(chat => chat.id === activeChatId) || null;
}

function ensureConversation() {
    let conversation = getActiveConversation();

    if (!conversation) {
        conversation = createConversation();
    }

    return conversation;
}

function renderHistory() {
    chatHistory.replaceChildren();

    if (conversations.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-history";
        empty.textContent = "Your saved conversations will appear here.";
        chatHistory.appendChild(empty);
        return;
    }

    conversations.forEach(conversation => {
        const item = document.createElement("div");
        item.className = "history-item";

        if (conversation.id === activeChatId) {
            item.classList.add("active");
        }

        const openButton = document.createElement("button");
        openButton.className = "history-open";
        openButton.textContent = conversation.title || "New chat";
        openButton.title = conversation.title || "New chat";

        openButton.addEventListener("click", () => {
            activeChatId = conversation.id;
            saveConversations();
            renderHistory();
            renderConversation();

            if (window.innerWidth <= 760) {
                sidebar.classList.remove("open");
            }
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-chat";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete this chat";
        deleteButton.setAttribute("aria-label", "Delete this chat");

        deleteButton.addEventListener("click", event => {
            event.stopPropagation();
            deleteConversation(conversation.id);
        });

        item.append(openButton, deleteButton);
        chatHistory.appendChild(item);
    });
}

function deleteConversation(id) {
    const index = conversations.findIndex(chat => chat.id === id);

    if (index === -1) {
        return;
    }

    const deletingActive = activeChatId === id;

    conversations = conversations.filter(chat => chat.id !== id);

    if (deletingActive) {
        activeChatId = conversations.length ? conversations[0].id : null;
    }

    saveConversations();
    renderHistory();
    renderConversation();
    showToast("Chat deleted.");
}

function deleteAllConversations() {
    if (conversations.length === 0) {
        showToast("There are no chats to delete.");
        return;
    }

    const confirmed = window.confirm(
        "Delete all saved conversations? This cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    conversations = [];
    activeChatId = null;

    saveConversations();
    renderHistory();
    renderConversation();
    showToast("All chats deleted.");
}

function renderConversation() {
    chatMessages.replaceChildren();

    const conversation = getActiveConversation();

    if (!conversation || conversation.messages.length === 0) {
        welcomeScreen.hidden = false;
        return;
    }

    welcomeScreen.hidden = true;

    conversation.messages.forEach(message => {
        appendMessageToScreen(message.text, message.sender);
    });

    chatArea.scrollTop = chatArea.scrollHeight;
}

function appendMessageToScreen(text, sender) {
    const message = document.createElement("div");
    message.className = sender === "user"
        ? "message user-message"
        : "message bot-message";

    const content = document.createElement("div");
    content.className = "message-text";
    content.textContent = text;

    message.appendChild(content);
    chatMessages.appendChild(message);
}

function addMessage(text, sender) {
    const conversation = ensureConversation();

    conversation.messages.push({
        sender,
        text,
        time: Date.now()
    });

    conversation.updatedAt = Date.now();

    if (conversation.title === "New chat" && sender === "user") {
        conversation.title = text.length > 32
            ? text.slice(0, 32).trim() + "…"
            : text;
    }

    saveConversations();
    renderHistory();

    welcomeScreen.hidden = true;
    appendMessageToScreen(text, sender);

    chatArea.scrollTop = chatArea.scrollHeight;
}

function startNewChat() {
    createConversation();

    if (window.innerWidth <= 760) {
        sidebar.classList.remove("open");
    }
}

function sendMessage(text) {
    const question = text.trim();

    if (!question) {
        return;
    }

    ensureConversation();
    addMessage(question, "user");

    userInput.value = "";
    userInput.style.height = "auto";

    const answer = findAnswer(question);

    addMessage(answer, "bot");
    userInput.focus();
}

$("#newChat").addEventListener("click", startNewChat);
$("#clearChat").addEventListener("click", () => {
    const conversation = getActiveConversation();

    if (!conversation || conversation.messages.length === 0) {
        showToast("This chat is already empty.");
        return;
    }

    const confirmed = window.confirm("Clear all messages in this chat?");

    if (!confirmed) {
        return;
    }

    conversation.messages = [];
    conversation.title = "New chat";
    conversation.updatedAt = Date.now();

    saveConversations();
    renderHistory();
    renderConversation();
    showToast("Chat messages cleared.");
});

$("#clearAllChats").addEventListener("click", deleteAllConversations);

$("#menuButton").addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

chatForm.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(userInput.value);
});

userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

userInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

document.querySelectorAll("[data-question]").forEach(button => {
    button.addEventListener("click", () => {
        sendMessage(button.dataset.question);
    });
});

const technologies = [
    {
        name: "Java",
        aliases: ["java language"],
        definition: "Java is a high-level, object-oriented programming language.",
        creator: "Java was developed by James Gosling and his team at Sun Microsystems.",
        year: "Java was first released in 1995.",
        uses: "Java is used for Android applications, enterprise software, banking systems, web backends, and desktop applications.",
        types: "Java has primitive data types and reference data types. Common platform technologies include Java SE and Jakarta EE.",
        features: "Java supports object-oriented programming, JVM-based portability, exception handling, multithreading, and automatic memory management.",
        advantages: "Java is portable, widely supported, object-oriented, and has a large ecosystem of libraries.",
        disadvantages: "Java can use considerable memory, and some programs require more code than equivalent programs in shorter-syntax languages.",
        difference: "Java commonly runs on the JVM. JavaScript is a separate language commonly used for browser interactivity."
    },
    {
        name: "Python",
        aliases: ["python language"],
        definition: "Python is a high-level, general-purpose programming language known for readable syntax.",
        creator: "Python was created by Guido van Rossum.",
        year: "Python was first released in 1991.",
        uses: "Python is used in AI, machine learning, automation, data analysis, web development, and scripting.",
        types: "Python has types such as int, float, str, bool, list, tuple, set, and dict.",
        features: "Python supports dynamic typing, functions, classes, modules, exceptions, and many libraries.",
        advantages: "Python is beginner-friendly, readable, versatile, and has a large community.",
        disadvantages: "Python can be slower than compiled languages for some CPU-intensive tasks.",
        difference: "Python is dynamically typed and known for concise syntax. Java is statically typed and commonly runs on the JVM."
    },
    {
        name: "HTML",
        aliases: ["hypertext markup language"],
        definition: "HTML stands for HyperText Markup Language. It defines the structure and content of web pages.",
        creator: "HTML was developed by Tim Berners-Lee.",
        year: "HTML was introduced in 1991.",
        uses: "HTML is used to create headings, paragraphs, links, images, forms, tables, and webpage elements.",
        types: "HTML has evolved through versions such as HTML 4 and HTML5. Modern HTML follows the HTML Living Standard.",
        features: "HTML supports tags, elements, attributes, hyperlinks, forms, semantic elements, and multimedia.",
        advantages: "HTML is easy to learn, supported by browsers, and provides the basic structure of websites.",
        disadvantages: "HTML alone cannot provide complex styling or programming logic.",
        difference: "HTML structures webpage content, CSS styles it, and JavaScript adds behaviour."
    },
    {
        name: "CSS",
        aliases: ["cascading style sheets"],
        definition: "CSS stands for Cascading Style Sheets. It controls the appearance and layout of web pages.",
        creator: "CSS was proposed by Håkon Wium Lie.",
        year: "The first CSS specification was published in 1996.",
        uses: "CSS is used for colours, fonts, spacing, responsive layouts, animations, and webpage design.",
        types: "The common ways to apply CSS are inline CSS, internal CSS, and external CSS.",
        features: "CSS supports selectors, the box model, Flexbox, Grid, media queries, transitions, and animations.",
        advantages: "CSS separates presentation from content, enables reusable styles, and supports responsive layouts.",
        disadvantages: "Large stylesheets can be difficult to maintain, and browser differences sometimes require testing.",
        difference: "CSS styles HTML content. HTML defines the webpage structure."
    },
    {
        name: "JavaScript",
        aliases: ["javascript language", "js"],
        definition: "JavaScript is a programming language used to make websites interactive and build server-side applications.",
        creator: "JavaScript was created by Brendan Eich in 1995.",
        year: "JavaScript was created in 1995.",
        uses: "JavaScript is used for interactive websites, web applications, Node.js servers, and browser games.",
        types: "JavaScript has primitive types including string, number, bigint, boolean, undefined, symbol, and null. Objects are another major category.",
        features: "JavaScript supports functions, objects, events, promises, async/await, modules, and DOM manipulation.",
        advantages: "JavaScript runs in browsers, supports interactive interfaces, and has a large ecosystem.",
        disadvantages: "Dynamic typing can lead to runtime errors, and asynchronous programming can be challenging for beginners.",
        difference: "JavaScript commonly runs in browsers or JavaScript runtimes. Java commonly runs on the JVM."
    },
    {
        name: "javac",
        aliases: ["java compiler", "javac compiler"],
        definition: "javac is the Java compiler included in the JDK. It compiles Java source code into JVM bytecode.",
        creator: "javac is part of Java development tools originally developed by Sun Microsystems and maintained in OpenJDK.",
        year: "javac has been part of Java development tools since Java's early releases in the 1990s.",
        uses: "javac compiles .java source files into .class bytecode files.",
        types: "javac is a command-line compiler tool with options for classpaths, output directories, and language versions.",
        features: "javac supports compilation, classpaths, compiler options, annotation processing, and diagnostic messages.",
        advantages: "javac detects many compile-time errors and produces bytecode for a compatible JVM.",
        disadvantages: "javac compiles code but does not itself execute the application. Running the application requires a compatible Java runtime.",
        difference: "javac compiles Java source code. The java command launches an application using the JVM."
    },
    {
        name: "C#",
        aliases: ["c sharp", "csharp"],
        definition: "C# is a modern, general-purpose, object-oriented programming language developed by Microsoft.",
        creator: "C# was developed by Anders Hejlsberg and his team at Microsoft.",
        year: "C# was introduced in 2000.",
        uses: "C# is used for .NET applications, web APIs, desktop software, cloud services, and Unity games.",
        types: "C# has value types, such as int and bool, and reference types, such as classes, arrays, and strings.",
        features: "C# supports classes, interfaces, generics, LINQ, exception handling, async/await, and automatic memory management.",
        advantages: "C# provides strong typing, modern language features, and broad .NET support.",
        disadvantages: "Beginners may need time to understand its type system, language features, and frameworks.",
        difference: "C# commonly runs on .NET, while Java commonly runs on the JVM. Both support object-oriented programming."
    }
];

function normalizeText(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9#+.\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function findTechnology(question) {
    const q = normalizeText(question);

    const sorted = [...technologies].sort((a, b) => {
        const aLength = Math.max(a.name.length, ...a.aliases.map(alias => alias.length));
        const bLength = Math.max(b.name.length, ...b.aliases.map(alias => alias.length));
        return bLength - aLength;
    });

    return sorted.find(technology => {
        const names = [technology.name, ...technology.aliases];

        return names.some(name => {
            if (name === "C#") {
                return /\bc#\b/.test(q) || q.includes("c sharp") || q.includes("csharp");
            }

            if (name === "JS" || name === "js") {
                return /\bjs\b/.test(q) || q.includes("javascript");
            }

            return q.includes(normalizeText(name));
        });
    }) || null;
}

function findAnswer(userQuestion) {
    const q = normalizeText(userQuestion);

    if (!q) {
        return "Please type a technology question.";
    }

    if (/^(hi|hello|hey|hii|hai)\b/.test(q)) {
        return "Hello! I am TechBot. Ask me about Java, Python, HTML, CSS, JavaScript, javac, or C#.";
    }

    if (q.includes("thank")) {
        return "You're welcome! Ask me another technology question.";
    }

    if (q === "help" || q.includes("what can you do")) {
        return "I answer questions about definitions, creators, release years, types, features, uses, advantages, disadvantages, and differences in Java, Python, HTML, CSS, JavaScript, javac, and C#.";
    }

    if (q.includes("artificial intelligence") || q === "what is ai") {
        return "Artificial intelligence (AI) is a field of computing that develops systems able to perform tasks such as understanding language, recognising images, and making predictions.";
    }

    if (q.includes("cybersecurity")) {
        return "Cybersecurity is the practice of protecting computers, networks, applications, and data from attacks and unauthorised access.";
    }

    if (q.includes("difference between java and javascript")) {
        return "Java and JavaScript are different programming languages. Java commonly runs on the JVM, while JavaScript commonly runs in browsers and JavaScript runtimes such as Node.js.";
    }

    if (q.includes("difference between python and java")) {
        return "Python is dynamically typed and known for concise syntax. Java is statically typed and commonly runs on the JVM.";
    }

    if (q.includes("difference between html and css")) {
        return "HTML structures webpage content, while CSS controls its appearance, including colours, fonts, spacing, and layout.";
    }

    if (q.includes("difference between html and javascript")) {
        return "HTML structures webpage content. JavaScript adds behaviour, responds to events, and updates page content.";
    }

    if (q.includes("difference between css and javascript")) {
        return "CSS controls visual presentation. JavaScript adds logic and interactivity.";
    }

    if (q.includes("difference between c# and java")) {
        return "C# commonly runs on .NET, while Java commonly runs on the JVM. Both support object-oriented programming but have different ecosystems.";
    }

    const technology = findTechnology(userQuestion);

    if (!technology) {
        if (q.includes("html") && q.includes("stand for")) {
            return technologies.find(t => t.name === "HTML").definition;
        }

        if (q.includes("css") && q.includes("stand for")) {
            return technologies.find(t => t.name === "CSS").definition;
        }

        return "I don't have a specific answer for that question yet. Try asking about Java, Python, HTML, CSS, JavaScript, javac, C#, artificial intelligence, or cybersecurity.";
    }

    if (/\b(who|creator|created|inventor|invented|developed|developer|proposed)\b/.test(q)) {
        return technology.creator;
    }

    if (/\bwhen\b/.test(q)) {
        return technology.year;
    }

    if (q.includes("advantage")) {
        return technology.advantages;
    }

    if (q.includes("disadvantage") || q.includes("limitation")) {
        return technology.disadvantages;
    }

    if (q.includes("type")) {
        return technology.types;
    }

    if (q.includes("feature") || q.includes("characteristic")) {
        return technology.features;
    }

    if (q.includes("difference") || q.includes("compare")) {
        return technology.difference;
    }

    if (q.includes("use") || q.includes("application") || q.includes("where")) {
        return technology.uses;
    }

    if (q.includes("how")) {
        return technology.features + " " + technology.uses;
    }

    if (q.includes("why") || q.includes("importance")) {
        return technology.advantages + " " + technology.uses;
    }

    if (q.includes("beginner") || q.includes("learn") || q.includes("started")) {
        return "Start with the basic concepts, practise small examples, and build simple projects. " + technology.definition;
    }

    if (q.includes("purpose")) {
        return technology.uses;
    }

    return technology.definition;
}

function restoreApplication() {
    const activeExists = conversations.some(chat => chat.id === activeChatId);

    if (!activeExists) {
        activeChatId = conversations.length ? conversations[0].id : null;
    }

    renderHistory();

    if (activeChatId) {
        renderConversation();
    } else {
        welcomeScreen.hidden = false;
        chatMessages.replaceChildren();
    }
}

restoreApplication();

window.findAnswer = findAnswer;
window.technologies = technologies;
