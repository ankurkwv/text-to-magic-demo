/* Particle Explosion by Dean Wagman https://codepen.io/deanwagman/pen/EjLBdQ */
let canvas = document.querySelector("#canvas"),
  ctx = canvas.getContext('2d');

// Set Canvas to be window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Configuration, Play with these
let config = {
  particleNumber: 500,
  maxParticleSize: 10,
  maxSpeed: 30,
  colorVariation: 5,
  x: window.innerWidth / 2,
  y: window.innerHeight / 2
};

// Colors
let colorPalette = {
  bg: {
    r: 14,
    g: 18,
    b: 41
  },
  matter: [{
      r: 177,
      g: 177,
      b: 207
    }, // light blue
    {
      r: 223,
      g: 68,
      b: 77
    }, // rockDust
    {
      r: 255,
      g: 147,
      b: 153
    }, // solorFlare
    {
      r: 223,
      g: 225,
      b: 240
    } // totesASun
  ]
};

// Some Variables hanging out
let particles = [],
  centerX = canvas.width / 2,
  centerY = canvas.height / 2;

// Draws the background for the canvas, because space
const drawBg = function(ctx, color) {
  ctx.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

// Particle Constructor
const Particle = function(x, y, maxSpeed) {
  // X Coordinate
  this.x = x || Math.round(Math.random() * canvas.width);
  // Y Coordinate
  this.y = y || Math.round(Math.random() * canvas.height);
  // Radius of the space dust
  this.r = Math.ceil(Math.random() * config.maxParticleSize);
  // Color of the rock, given some randomness
  this.c = colorVariation(colorPalette.matter[Math.floor(Math.random() * colorPalette.matter.length)], true);
  // maxSpeed of which the rock travels
  this.s = Math.pow(Math.ceil(Math.random() * maxSpeed), .7);
  // Direction the Rock flies
  this.d = Math.round(Math.random() * 360);
};

// Provides some nice color variation
// Accepts an rgba object
// returns a modified rgba object or a rgba string if true is passed in for argument 2
const colorVariation = function(color, returnString) {
  var r, g, b, a, variation;
  r = Math.round(((Math.random() * config.colorVariation) - (config.colorVariation / 2)) + color.r);
  g = Math.round(((Math.random() * config.colorVariation) - (config.colorVariation / 2)) + color.g);
  b = Math.round(((Math.random() * config.colorVariation) - (config.colorVariation / 2)) + color.b);
  a = Math.random() + .5;
  if (returnString) {
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  } else {
    return {
      r,
      g,
      b,
      a
    };
  }
};

// Used to find the rocks next point in space, accounting for speed and direction
const updateParticleModel = function(p) {
  var a = 180 - (p.d + 90); // find the 3rd angle
  p.d > 0 && p.d < 180 ? p.x += p.s * Math.sin(p.d) / Math.sin(p.s) : p.x -= p.s * Math.sin(p.d) / Math.sin(p.s);
  p.d > 90 && p.d < 270 ? p.y += p.s * Math.sin(a) / Math.sin(p.s) : p.y -= p.s * Math.sin(a) / Math.sin(p.s);
  return p;
};

// Just the function that physically draws the particles
// Physically? sure why not, physically.
const drawParticle = function(x, y, r, c) {
  ctx.beginPath();
  ctx.fillStyle = c;
  ctx.arc(x, y, r, 0, 2 * Math.PI, false);
  ctx.fill();
  ctx.closePath();
};

// Remove particles that aren't on the canvas
const cleanUpArray = function() {
  particles = particles.filter((p) => {
    if (!(p.x < 0 || p.x > 1000 || p.y < 0 || p.y > 1000)) {
      return p;
    }
  });
  console.log(particles.length);
  console.log('Cleaning up array')
};


const initParticles = function(numParticles, x, y, maxSpeed) {
  console.log(particles);
  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle(x, y, maxSpeed));
  }
  particles.forEach((p) => {
    drawParticle(p.x, p.y, p.r, p.c);
  });
};

const frame = function() {
  // Draw background first
  drawBg(ctx, colorPalette.bg);
  // Update Particle models to new position
  particles.map((p) => {
    return updateParticleModel(p);
  });
  // Draw em'
  particles.forEach((p) => {
    drawParticle(p.x, p.y, p.r, p.c);
  });
  // Play the same song? Ok!
  window.requestAnimationFrame(frame);
};

const repeatParticles = function() {
  
  console.log('Drawing some particles')
  initParticles(20, config.x, config.y, 1);
  cleanUpArray();
  return;
}

$(document).ready(function() {
  
  frame();
  setInterval(repeatParticles, 1000)


  var shownMagics = [];

  function insertMagic(magic) {
    if (shownMagics.indexOf(magic.index) == -1) {
      shownMagics.push(magic.index);
      cleanUpArray();
      initParticles(config.particleNumber, config.x, config.y, config.maxSpeed);
      $('.circle-with-text').addClass('end-state');
      $('#button').addClass('end-state');
      $('#waiting').html('<span class="red">' + magic.data.name + '</span>' + ' sent us <span class="red">magic</span>! Who\'s next?');
    }
  }

  // Function to get Sync token from Twilio Function

  function getSyncToken(callback) {
    $.getJSON('/sync_token.js')
      .then(function(data) {
        callback(data);
      });
  }

  // Connect to Sync "MagicTexters" List

  function startSync(token) {
    var syncClient = new Twilio.Sync.Client(token);

    syncClient.on('tokenAboutToExpire', function() {
      var token = getSyncToken(function(token) {
        syncClient.updateToken(token);
      });
    });

    syncClient.list('MagicTexters').then(function(list) {
      list.on('itemAdded', function(event) {
        console.log(event.item.index);
        insertMagic(event.item);
      });
    });
  }

  function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      var intlCode = (match[1] ? '+1 ' : '');
      return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
    }
    return phoneNumberString;
  }

  getSyncToken(function(responseData) {
    startSync(responseData.token);

    $('#number').html(formatPhoneNumber(responseData.number))
  });

});