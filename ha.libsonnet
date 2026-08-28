local devices = std.extVar('devices');
local entities = std.extVar('entities');

local devices_by_id = {
  [device.id]: device
  for device in devices.result
};

local entities_by_id = {
  [entity.entity_id]: entity
  for entity in entities.result
};

local normalize = function(value)
  if std.isArray(value) then value else [value];

{
  triggers: {
    lutron_press(entity_id)::
      local entity = entities_by_id[entity_id];
      local id_parts = std.split(entity_id, '_');
      {
        trigger: 'device',
        device_id: entity.device_id,
        domain: 'lutron_caseta',
        type: 'press',
        subtype: id_parts[std.length(id_parts) - 1],
      },
    numeric_state(entity_id, above=null, below=null):: {
      trigger: 'numeric_state',
      entity_id: entity_id,
      [if above != null then 'above']: above,
      [if below != null then 'below']: below,
    },
    state(entity_id, to=null, from=null):: {
      trigger: 'state',
      entity_id: entity_id,
      [if to != null then 'to']: to,
      [if from != null then 'from']: from,
    },
  },

  actions: {
    cover(entity_id, action_type):: {
      device_id: entities_by_id[entity_id].device_id,
      domain: 'cover',
      entity_id: entities_by_id[entity_id].id,
      type: action_type,
    },
    light_on(entity_id, brightness=null):: {
      target: {
        entity_id: entity_id
      },
      action: 'light.turn_on',
      data: if brightness != null then { brightness: brightness } else {},
    },
    switch_on(entity_id):: {
      target: {
        entity_id: entity_id
      },
      action: 'switch.turn_on',
    },
    switch_off(entity_id):: {
      device_id: entities_by_id[entity_id].device_id,
      domain: 'switch',
      entity_id: entities_by_id[entity_id].id,
      type: 'turn_off',
    },
    unlock(entity_id):: {
      device_id: entities_by_id[entity_id].device_id,
      domain: 'lock',
      entity_id: entities_by_id[entity_id].id,
      type: 'unlock',
    },
    scene(scene_id):: {
      target: {
        entity_id: scene_id,
      },
      action: 'scene.turn_on',
    },
    lock(entity_ids):: {
      action: 'lock.lock',
      target: {
        entity_id: entity_ids,
      },
    },
    input_boolean(entity_id, action_type):: {
      target: {
        entity_id: entity_id,
      },
      action: 'input_boolean.' + action_type,
    },
    delay(seconds):: {
      delay: {
        seconds: seconds
      },
    },
    repeat(count, sequence):: {
      repeat: {
        count: count,
        sequence: sequence,
      },
    },
    _if(condition, then_action):: {
      'if': [condition],
      'then': then_action,
    },
    notify(target, message, title=null):: {
      action: 'notify.' + target,
      data: { message: message } + (if title != null then { title: title } else {}),
    },
  },

  automation(alias, trigger, action, mode='single'):: {
    alias: alias,
    id: 'automation.' + std.native('slug')(alias),
    triggers: normalize(trigger),
    actions: normalize(action),
    conditions: [],
    description: '',
    mode: mode,
  },

  boolean_helper(name, default, _description):: {
    id: 'input_boolean.' + std.native('slug')(name),
    name: name,
  },

  time_helper(name, _description):: {
    id: 'input_datetime.' + std.native('slug')(name),
    name: name,
    has_date: false,
    has_time: true,
  },

  template_helper(name, template):: {
    id: 'sensor.' + std.native('slug')(name),
    name: name,
    state: template,
  },

  dashboard(title, url_path, views, icon=null):: {
    id: 'dashboard.' + url_path,
    url_path: url_path,
    title: title,
    [if icon != null then 'icon']: icon,
    views: normalize(views),
  },

  heading(text, style):: {
    type: 'heading',
    heading: text,
    heading_style: style,
  },

  tile(entity, action='toggle', name=null, icon=null, columns='full', additional_controls=null, features_position='bottom')::
    local tap = if std.isString(action)
                then { action: action }
                else action;
    {
      type: 'tile',
      entity: entity,
      grid_options: { columns: columns },
      show_entity_picture: true,
      vertical: false,
      tap_action: tap,
      icon_tap_action: tap,
      features_position: features_position,
      [if name != null then 'name']: name,
      [if icon != null then 'icon']: icon,
      [if additional_controls != null then 'features']: [
        { type: 'custom:service-call', entries: additional_controls },
      ],
    },

  perform_action(action, entity_id, data=null):: {
    action: 'perform-action',
    perform_action: action,
    target: { entity_id: entity_id },
    [if data != null then 'data']: data,
  },

  button(icon, tap_action, styles=null):: {
    type: 'button',
    icon: icon,
    tap_action: tap_action,
    [if styles != null then 'styles']: styles,
  },

  spinbox(entity_id, value_attribute, tap_action, range, step=1, label='{{ value | float }}'):: {
    type: 'spinbox',
    entity_id: entity_id,
    value_attribute: value_attribute,
    icon: '',
    autofill_entity_id: false,
    label: label,
    step: step,
    range: range,
    hold_action: { action: 'repeat' },
    tap_action: tap_action,
  },

  toggle(entity_id, tap_action, checked_values, checked_icon=null, unchecked_icon=null, styles=null):: {
    type: 'toggle',
    thumb: 'md3-switch',
    entity_id: entity_id,
    value_attribute: 'state',
    autofill_entity_id: false,
    checked_values: checked_values,
    [if checked_icon != null then 'checked_icon']: checked_icon,
    [if unchecked_icon != null then 'unchecked_icon']: unchecked_icon,
    tap_action: tap_action,
    [if styles != null then 'styles']: styles,
  },

  home_summary(summary, tap_action, columns='full'):: {
    type: 'home-summary',
    summary: summary,
    tap_action: tap_action,
    grid_options: { columns: columns },
  },

  template(icon, primary, secondary, columns='full'):: {
    type: 'custom:mushroom-template-card',
    grid_options: { columns: columns, },
    icon: icon,
    icon_color: 'blue',
    primary: primary,
    secondary: secondary,
  }
}
