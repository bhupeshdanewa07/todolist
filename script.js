document.addEventListener("DOMContentLoaded", () => {
  const todoInput = document.getElementById("todo-input");
  const addBtn = document.getElementById("add-btn");
  const todoList = document.getElementById("todo-list");
  const emptyState = document.getElementById("empty-state");
  const dateDisplay = document.getElementById("date-display");

  const options = { weekday: "long", month: "long", day: "numeric" };
  dateDisplay.textContent = new Date().toLocaleDateString("en-US", options);

  loadTodos();
  updateEmptyState();

  addBtn.addEventListener("click", addTodo);
  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTodo();
  });

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

    const checkBtn = li.querySelector(".check-btn");
    const todoText = li.querySelector(".todo-text");
    const deleteBtn = li.querySelector(".delete-btn");

    const toggleHandler = () => toggleComplete(li, todo.id);
    checkBtn.addEventListener("click", toggleHandler);
    todoText.addEventListener("click", toggleHandler);

    deleteBtn.addEventListener("click", () => deleteTodo(li, todo.id));

    li.addEventListener("dragstart", () => {
      li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      saveOrderToLocal();
    });

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

  function getTodosFromLocal() {
    return localStorage.getItem("todos")
      ? JSON.parse(localStorage.getItem("todos"))
      : [];
  }

  function saveTodoToLocal(todo) {
    const todos = getTodosFromLocal();
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

    todos.reverse().forEach((todo) => createTodoElement(todo));
  }
});
