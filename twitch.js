// Function to display toast
function showToast(message) {
  const toastContainer = document.querySelector('.toast-container');

  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  const toastHeader = document.createElement('div');
  toastHeader.className = 'toast-header';
  toastHeader.innerHTML = `
    <strong class="me-auto">PolyChat</strong>
    <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close"></button>
  `;

  const toastBody = document.createElement('div');
  toastBody.className = 'toast-body';
  toastBody.textContent = message;

  toast.appendChild(toastHeader);
  toast.appendChild(toastBody);

  toastContainer.appendChild(toast);

  // Automatically remove the toast after a few seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Function to parse emotes in a message
function parseEmotes(message, emoteData) {
  if (!emoteData || !emoteData.emotes) {
    return message;
  }

  const emotes = emoteData.emotes;
  const emoteIndices = [];

  // Extract emote indices from the emote data
  Object.keys(emotes).forEach(emoteId => {
    const emoteInstances = emotes[emoteId];
    emoteInstances.forEach(instance => {
      const [start, end] = instance.split('-').map(Number);
      emoteIndices.push({ start, end, id: emoteId });
    });
  });

  // Sort emote indices by start position in descending order
  emoteIndices.sort((a, b) => b.start - a.start);

  // Replace emote codes with images in the message
  emoteIndices.forEach(({ start, end, id }) => {
    const emoteCode = message.substring(start, end + 1);
    const imageUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/light/1.0`;

    // Adding Bootstrap tooltip markup for emotes
    message = message.substring(0, start) + `<img src="${imageUrl}" alt="${emoteCode}" class="emote-image" data-bs-toggle="tooltip" data-bs-placement="top" title="Emote: ${emoteCode} | Provider: ${getEmoteProvider(id)}">` + message.substring(end + 1);
  });

  return message;
}

// Function to check if a user is banned
function isUserBanned(username, bannedUsers) {
  return bannedUsers.includes(username.toLowerCase());
}

// Function to get the emote provider based on emote ID
function getEmoteProvider(emoteId) {
  // You may need to customize this based on the actual emote provider logic
  if (emoteId.startsWith('twitch')) {
    return 'Twitch';
  } else if (emoteId.startsWith('7tv')) {
    return '7TV';
  } else if (emoteId.startsWith('bttv')) {
    return 'BTTV';
  } else if (emoteId.startsWith('ffz')) {
    return 'FFZ';
  } else {
    return 'Unknown Provider';
  }
}

// Function to display tooltip for emotes
function initializeTooltips() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

// Twitch client initialization
const clientOptions = {
  connection: {
    secure: true,
    reconnect: true
  }
};

let client;

function initializeClient(channel, bannedUsers) {
  if (client) {
    client.disconnect();
  }
  clientOptions.channels = [channel];
  client = new tmi.Client(clientOptions);

  // Connect to Twitch IRC server
  client.connect();

  // Listen for chat messages
  client.on('message', (channel, tags, message, self) => {
    // Check if the user is banned
    if (isUserBanned(tags['username'], bannedUsers)) {
      // User is banned, do not process the message
      showToast(`User ${tags['username']} is banned. Message not displayed.`);
      return;
    }

    // Parse emotes in the message
    message = parseEmotes(message, tags);

    // Display the chat message in the chat log
    displayChatMessage(`${tags['username']}: ${message}`);

    // Initialize tooltips after appending messages
    initializeTooltips();
  });

  // Show toast when the chat is connected
  showToast(`Twitch Chat Connected! Channel: ${channel}`);

  // Update the connection alert
  document.getElementById("connectedChannel").innerText = channel;
  document.getElementById("connectionAlert").style.display = "block";

  // Auto-scroll to the bottom of the chat log when a new message is received
  const chatMessages = document.getElementById("chat-messages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to display chat messages in the chat log
function displayChatMessage(message) {
  const chatMessages = document.getElementById("chat-messages");
  const newMessage = document.createElement("div");
  newMessage.className = "chat-message";
  newMessage.innerHTML = message;
  chatMessages.appendChild(newMessage);

  // Auto-scroll to the bottom of the chat log
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Fetch channels and banned users from JSON files
Promise.all([fetch('users.json'), fetch('Banned.json')])
  .then(responses => Promise.all(responses.map(response => response.json())))
  .then(data => {
    const [userData, bannedData] = data;

    const channelSelect = document.getElementById("channel-select");

    // Populate the dropdown with channels from the JSON file
    userData.channels.forEach(channel => {
      const option = document.createElement("option");
      option.value = channel;
      option.text = channel;
      channelSelect.appendChild(option);
    });

    // Initialize with the default channel and banned users
    initializeClient(userData.channels[0], bannedData.BannedUsers);

    // Display search bar and default channel
    const searchInput = document.getElementById("channel-search");
    searchInput.addEventListener("input", handleSearch);

    // Display tracked users
    // displayTrackedUsers(userData.channels);
  })
  .catch(error => {
    const errorMessage = 'Error fetching data: ' + error.message;
    console.error(errorMessage);
    console.error(errorMessage);
  });

// Function to switch channels
function switchChannel() {
  var channelSelect = document.getElementById("channel-select");
  var selectedChannel = channelSelect.value;

  // Update the client with the selected channel
  initializeClient(selectedChannel);

  // Clear the chat log when switching channels
  var chatMessages = document.getElementById("chat-messages");
  chatMessages.innerHTML = "";
}

// Function to handle search input
function handleSearch() {
  const searchInput = document.getElementById("channel-search");
  const searchString = searchInput.value.toLowerCase();
  const channelSelect = document.getElementById("channel-select");

  const options = channelSelect.options;
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const channelName = option.text.toLowerCase();

    if (channelName.includes(searchString)) {
      option.style.display = "";
    } else {
      option.style.display = "none";
    }
  }
}
