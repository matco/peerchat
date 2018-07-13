'use strict';

class Reviver {
	constructor(parameters) {
		//String : property used to know how to type raw objects
		this.entityProperty = Reviver.ENTITY_PROPERTY;
		//String : value used to know which property is a back reference
		this.backReferenceValue = Reviver.BACK_REFERENCE;
		//Function : must return an instance for entity
		//you create object manually
		this.factory;
		//Function : must return a constructor for an entity
		this.entitiesConstructors;
		//Function : must return an array of all properties for an entity
		//only properties returned by this function are imported
		this.entitiesProperties;
		//Boolean : preserve entity property
		//entity property must be returned by this.entitiesProperties function to be kept in final object in strict mode
		this.preserveEntityProperty = false;
		//Boolean : write to console properties which are present in raw object but have not been defined by this.entitiesProperties function
		//show something only in strict mode
		this.debug = false;
		//Function : callback to apply for every objects after the revival
		//callback is called after the revival with four arguments : revived object, entity, container and raw object
		this.callback;

		//bind parameters
		for(const parameter in parameters) {
			this[parameter] = parameters[parameter];
		}

		//check required conditions
		if(!this.factory && !this.entitiesConstructors) {
			throw 'A factory or a function which returns entity constructor is required';
		}
		if(this.factory && this.entitiesConstructors) {
			throw 'You can not specify a factory and an entity constructor function at the same time';
		}

		//build factory using constructor function
		if(!this.factory && this.entitiesConstructors) {
			this.factory = function(entity) {
				const builder = this.entitiesConstructors(entity);
				if(!builder) {
					throw new Error('Missing constructor for entity ' + entity);
				}
				return new builder();
			};
		}
	}
	revive(object, container) {
		//creating new entity
		if(object) {
			//array of objects
			if(Array.isArray(object)) {
				//following code is equivalent to "return object.map(o => this.revive(o, container));" but faster!
				const proto_object = [];
				for(let i = 0, length = object.length; i < length; i++) {
					proto_object[i] = this.revive(object[i], container);
				}
				return proto_object;
			}
			//object
			if(typeof object === 'object') {
				//typed object
				if(object[this.entityProperty]) {
					//create prototyped object
					//TODO improve this, it would be nice to send values directly to factory to be able to construct the object directly with its values
					//this would open the doors for immutables objects
					//this requires to set back reference in a second pass
					const proto_object = this.factory(object[this.entityProperty]);
					//import properties
					for(const property in object) {
						//check current property is not inherited and not the entity property (if entity property is not preserved)
						if(object.hasOwnProperty(property) && (this.preserveEntityProperty || property !== this.entityProperty)) {
							//in strict mode, check that current property has been declared in class
							if(!this.entitiesProperties || this.entitiesProperties(object[this.entityProperty]).includes(property)) {
								proto_object[property] = this.revive(object[property], proto_object);
							}
							else {
								//delete property
								delete proto_object[property];
								if(this.debug) {
									//warn user that a property from the object has not been declared in class
									console.log('Property ' + property + ' (value: ' + object[property] + ') does not exist in ' + object[this.entityProperty] + ' and has been deleted', 'Object:', object);
								}
							}
						}
					}
					//set back references
					if(container) {
						const properties = Object.getOwnPropertyNames(proto_object);
						//inverse loop for performance reasons
						for(let i = properties.length - 1; i >= 0; i--) {
							const property = properties[i];
							if(proto_object[property] === this.backReferenceValue) {
								proto_object[property] = container;
								//exclude this property for enumeration
								/*var descriptor = Object.getOwnPropertyDescriptor(proto_object, property);
								descriptor.enumerable = false;
								Object.defineProperty(proto_object, property, descriptor);*/
								//break; //only one back reference allowed //wrong, there can be more than one back references for entities linked to two different other entities
							}
						}
					}
					if(this.callback) {
						this.callback(proto_object, object[this.entityProperty], container, object);
					}
					return proto_object;
				}
				//map
				else {
					const proto_object = {};
					for(const key in object) {
						if(object.hasOwnProperty(key)) {
							//revive each value keeping a reference to container
							proto_object[key] = this.revive(object[key], container);
						}
					}
					return proto_object;
				}
			}
		}
		//object is not valid or is a primitive data type, return the original object without modification
		return object;
	}
}

Reviver.BACK_REFERENCE = 'BACK_REFERENCE';
Reviver.ENTITY_PROPERTY = 'entity';

export {Reviver};
