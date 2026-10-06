(function () {
  var form = document.getElementById("contact-form");
  var sent = document.getElementById("contact-sent");
  var status = document.getElementById("contact-status");
  var again = document.getElementById("contact-again");
  if (!form || !sent || !status) {
    return;
  }

  var button = form.querySelector(".submit-button");
  var label = button.querySelector("span");
  var endpoint = form.getAttribute("action");
  var placeholderKey = "WEB3FORMS_ACCESS_KEY";

  function showStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", !!isError);
  }

  function setBusy(busy) {
    button.disabled = busy;
    label.textContent = busy ? "Sending" : "Send message";
  }

  function showSent() {
    form.hidden = true;
    sent.hidden = false;
    sent.querySelector("h2").focus();
  }

  if (/[?&]sent=1\b/.test(window.location.search)) {
    showSent();
  }

  if (again) {
    again.addEventListener("click", function () {
      form.reset();
      showStatus("", false);
      sent.hidden = true;
      form.hidden = false;
      form.querySelector("input[type=email]").focus();
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = value;
    });

    if (data.botcheck) {
      showSent();
      return;
    }
    delete data.botcheck;
    delete data.redirect;

    if (data.access_key === placeholderKey) {
      showStatus("The form isn't connected yet. Please email support@topicdev.com instead.", true);
      return;
    }

    data.subject = "TopicDev: " + (data.app || "General") + " - " + (data.topic || "message");
    data.replyto = data.email;

    setBusy(true);
    showStatus("", false);

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (response) {
        return response.json().catch(function () {
          return { success: false };
        });
      })
      .then(function (result) {
        setBusy(false);
        if (result && result.success) {
          form.reset();
          showSent();
        } else {
          showStatus("Your message couldn't be sent. Please try again, or email support@topicdev.com.", true);
        }
      })
      .catch(function () {
        setBusy(false);
        showStatus("No connection to the form service. Please try again, or email support@topicdev.com.", true);
      });
  });
})();
