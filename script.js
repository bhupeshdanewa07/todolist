document.addEventListener("DOMContentLoaded", () => {
  // Select DOM elements
  const todoInput = document.getElementById("todo-input");
  const addBtn = document.getElementById("add-btn");
  const todoList = document.getElementById("todo-list");
  const emptyState = document.getElementById("empty-state");
  const dateDisplay = document.getElementById("date-display");

  // Set Date
  const options = { weekday: "long", month: "long", day: "numeric" };
  dateDisplay.textContent = new Date().toLocaleDateString("en-US", options);

  // Initial Load
  loadTodos();
  updateEmptyState();

  // Event Listeners
  addBtn.addEventListener("click", addTodo);
  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTodo();
  });

  // Drag Over Event for List (Global for the list)
  todoList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(todoList, e.clientY);
    const draggable = document.querySelector(".dragging");
    if (draggable) {
      if (afterElement == null) {
        todoList.appendChild(draggable);
      } else {
        todoList.insertBefore(draggable, afterElement);
      }
    }
  });

  // Functions

  function addTodo() {
    const text = todoInput.value.trim();

    if (text === "") {
      triggerShake();
      showToast("Please enter a task");
      return;
    }

    const todo = {
      id: Date.now(),
      text: text,
      completed: false,
    };

    createTodoElement(todo);
    saveTodoToLocal(todo);

    todoInput.value = "";
    updateEmptyState();

    // Add subtle haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function triggerShake() {
    todoInput.classList.add("shake", "error-border");
    todoInput.addEventListener(
      "animationend",
      () => {
        todoInput.classList.remove("shake");
      },
      { once: true }
    );

    // Remove error border on input
    todoInput.addEventListener(
      "input",
      () => {
        todoInput.classList.remove("error-border");
      },
      { once: true }
    );
  }

  function showToast(message) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;

    toastContainer.appendChild(toast);

    // Remove after animation (3s total: 0.3s enter + 2.4s wait + 0.3s exit)
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function createTodoElement(todo) {
    const li = document.createElement("li");
    li.classList.add("todo-item");
    if (todo.completed) li.classList.add("completed");
    li.setAttribute("data-id", todo.id);
    li.setAttribute("draggable", "true");

    li.innerHTML = `
            <div class="todo-content">
                <button class="check-btn">
                    <i class="fa-solid fa-check"></i>
                </button>
                <span class="todo-text">${todo.text}</span>
            </div>
            <button class="delete-btn">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

    // Event listeners for internal buttons
    const checkBtn = li.querySelector(".check-btn");
    const todoText = li.querySelector(".todo-text");
    const deleteBtn = li.querySelector(".delete-btn");

    const toggleHandler = () => toggleComplete(li, todo.id);
    checkBtn.addEventListener("click", toggleHandler);
    todoText.addEventListener("click", toggleHandler);

    deleteBtn.addEventListener("click", () => deleteTodo(li, todo.id));

    // Drag Events
    li.addEventListener("dragstart", () => {
      li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      saveOrderToLocal();
    });

    // Add to top of list (default behavior)
    // If loading from storage, we might simply append if the order is already preserved.
    // But here we insertBefore firstChild to make new tasks appear at top.
    // This is fine as long as we save the order correctly.
    todoList.insertBefore(li, todoList.firstChild);
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".todo-item:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  function toggleComplete(element, id) {
    element.classList.toggle("completed");

    // Update Local Storage based on current DOM order is safest to keep everything in sync
    saveOrderToLocal();
  }

  function deleteTodo(element, id) {
    element.classList.add("slide-out");

    element.addEventListener("animationend", () => {
      element.remove();
      removeTodoFromLocal(id);
      updateEmptyState();
    });
  }

  function updateEmptyState() {
    setTimeout(() => {
      if (todoList.children.length === 0) {
        emptyState.style.display = "flex";
        emptyState.style.animation = "fadeIn 0.5s ease";
      } else {
        emptyState.style.display = "none";
      }
    }, 100);
  }

  // Local Storage Helpers
  function getTodosFromLocal() {
    return localStorage.getItem("todos")
      ? JSON.parse(localStorage.getItem("todos"))
      : [];
  }

  function saveTodoToLocal(todo) {
    const todos = getTodosFromLocal();
    // Add to beginning of array so it matches visual 'top'
    todos.unshift(todo);
    localStorage.setItem("todos", JSON.stringify(todos));
  }

  function removeTodoFromLocal(id) {
    let todos = getTodosFromLocal();
    todos = todos.filter((t) => t.id !== id);
    localStorage.setItem("todos", JSON.stringify(todos));
  }

  function saveOrderToLocal() {
    const todos = [];
    document.querySelectorAll(".todo-item").forEach((item) => {
      const id = parseInt(item.getAttribute("data-id"));
      const text = item.querySelector(".todo-text").innerText;
      const completed = item.classList.contains("completed");
      todos.push({ id, text, completed });
    });
    localStorage.setItem("todos", JSON.stringify(todos));
  }

  function loadTodos() {
    const todos = getTodosFromLocal();
    // Since we save top-to-bottom and createTodoElement uses insertBefore(firstChild),
    // we need to iterate in REVERSE order to restore the visual list correctly.
    // Saved: [Item 1, Item 2, Item 3] (Item 1 is Top)
    // Reversed: Item 3, Item 2, Item 1
    // Create Item 3 -> Top
    // Create Item 2 -> Top (Item 3 pushed down)
    // Create Item 1 -> Top (Item 2 pushed down)
    // Result: Item 1, Item 2, Item 3. Correct.

    // Wait, if we use unshift for saveTodoToLocal, the array in storage is [Newest, ..., Oldest].
    // If we save order manually, it is [Top, ..., Bottom].
    // So yes, iterating in reverse and inserting at top creates the original order.

    todos.reverse().forEach((todo) => createTodoElement(todo));
  }
});
