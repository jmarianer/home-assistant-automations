# Home Assistant Automations

Manage Home Assistant automations using Jsonnet for a more powerful, programmatic approach.

## Setup

### 1. Create a Long-Lived Access Token

1. Navigate to http://homeassistant.local:8123/profile/security
2. Scroll down to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Give it a name (e.g., "Automations Management")
5. Copy the token immediately (you won't be able to see it again)

### 2. Configure the Token

You can provide the token in two ways:

**Option 1: Environment Variable**
```bash
export HA_TOKEN="your-long-lived-token-here"
```

**Option 2: Command-Line Flag**
```bash
npm run deploy -- --token "your-long-lived-token-here"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build the Project

```bash
npm run build
```

## Execution

### Preview Changes (Diff)

Before deploying, you can see what would change:

```bash
npm start diff
```

This will:
- Fetch current automations from Home Assistant
- Generate new automations from `automations.jsonnet`
- Show a JSON diff between them

### Deploy Automations

When you're ready to apply changes:

```bash
npm start deploy
```

This will:
1. Remove all existing automations
2. Generate new automations from `automations.jsonnet`
3. Create all new automations in Home Assistant

**Note:** You can also specify a custom base URL:
```bash
npm start diff -- --base-url "http://your-ha-instance:8123"
```

## Using `automations.jsonnet`

The `automations.jsonnet` file is where you define your automations using Jsonnet, a data templating language.

### Basic Structure

```jsonnet
local ha = import 'ha.libsonnet';

[
  ha.automation(
    'Automation Name',
    ha.triggers.lutron_press('button.some_button_on'),
    ha.actions.light_on('light.some_light')
  ),
]
```

### Multiple Triggers

You can use an array of triggers:

```jsonnet
ha.automation(
  'Bedroom lights on',
  [
    ha.triggers.lutron_press('button.bedroom_remote_1_on'),
    ha.triggers.lutron_press('button.bedroom_remote_2_on'),
  ],
  ha.actions.scene('scene.bedroom_on')
)
```

### Multiple Actions

Actions can also be arrays:

```jsonnet
ha.automation(
  'Garage open sequence',
  ha.triggers.lutron_press('button.car_pico_on'),
  [
    ha.actions.switch_on('switch.garage_lights'),
    ha.actions.cover('cover.garage_door', 'open'),
    ha.actions.unlock('lock.garage_lock'),
  ]
)
```

### Creating Reusable Functions

You can define functions in Jsonnet for reusable action sequences:

```jsonnet
local gradual_raise(time_in_seconds) = [
  ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_on'),
  ha.actions.repeat(time_in_seconds, [
    ha.actions.delay(1),
    ha.actions.light_on('light.bedroom_lights', '{{ (255 * ((repeat.index / %i) ** 2)) | int }}' % time_in_seconds),
  ]),
  ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_off'),
];

// Use the function
ha.automation(
  'Sunrise alarm',
  {
    platform: 'time',
    at: 'input_datetime.wake_up',
  },
  gradual_raise(1800)  // 30 minutes
)
```

### Available Helpers

The `ha.libsonnet` library provides helpers for common triggers and actions:

**Triggers:**
- `ha.triggers.lutron_press(entity_id)` - Lutron Caseta button press

**Actions:**
- `ha.actions.light_on(entity_id, brightness?)` - Turn on light
- `ha.actions.switch_on(entity_id)` - Turn on switch
- `ha.actions.switch_off(entity_id)` - Turn off switch
- `ha.actions.cover(entity_id, action)` - Control cover (open/close/stop)
- `ha.actions.scene(scene_id)` - Activate scene
- `ha.actions.lock(entity_ids)` - Lock one or more locks
- `ha.actions.unlock(entity_id)` - Unlock lock
- `ha.actions.input_boolean(entity_id, action)` - Control input boolean
- `ha.actions.delay(seconds)` - Add delay
- `ha.actions.repeat(count, sequence)` - Repeat action sequence
- `ha.actions._if(condition, then_action)` - Conditional action

### Custom Triggers

For triggers not covered by helpers, you can use raw Home Assistant trigger syntax:

```jsonnet
ha.automation(
  'Time-based trigger',
  {
    platform: 'time',
    at: 'input_datetime.wake_up',
  },
  ha.actions.light_on('light.bedroom')
)
```

### Accessing Device and Entity Data

The `ha.libsonnet` file has access to all your devices and entities via external variables. You can extend it to add more sophisticated logic based on your Home Assistant configuration.

## Project Structure

- `automations.jsonnet` - Your automation definitions
- `ha.libsonnet` - Helper library for creating Home Assistant automations
- `src/index.ts` - Main CLI tool
- `src/HAClient.ts` - Home Assistant WebSocket API client
- `build/` - Compiled JavaScript output
