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
  },

  automation(alias, trigger, action):: {
    alias: alias,
    id: 'automation.' + std.native('slug')(alias),
    triggers: normalize(trigger),
    actions: normalize(action),
    conditions: [],
    description: '',
    mode: 'single',
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
}
