import { APP } from '../config/app';
import { firebaseConfigured } from '../config/firebase';
import { localRepository } from './localRepository';
import { firebaseRepository } from './firebaseRepository';
import { COLLECTIONS } from './schema';

export const repository = (!APP.setupMode && firebaseConfigured)
  ? firebaseRepository
  : localRepository;

export const dataMode = repository.mode;

export const entities = Object.fromEntries(
  Object.entries(COLLECTIONS).map(([key, collectionName]) => [
    key,
    {
      collectionName,
      list: (options) => repository.list(collectionName, options),
      get: (id) => repository.get(collectionName, id),
      findOne: (filters) => repository.findOne(collectionName, filters),
      create: (data, forcedId) => repository.create(collectionName, data, forcedId),
      update: (id, patch) => repository.update(collectionName, id, patch),
      remove: (id) => repository.remove(collectionName, id),
      subscribe: (options, cb, onError) => repository.subscribe(collectionName, options, cb, onError),
    },
  ])
);
