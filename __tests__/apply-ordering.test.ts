import Knex from 'knex';
import { Model } from 'objection';

import Controller from '../src/controller';

describe('applyOrderByLite', () => {
  let knexInstance: ReturnType<typeof Knex>;

  class SampleModel extends Model {
    static tableName = 'users';
  }

  beforeAll(() => {
    knexInstance = Knex({ client: 'sqlite3', useNullAsDefault: true });
    Model.knex(knexInstance);
  });

  afterAll(async () => {
    await knexInstance.destroy();
  });

  test('builds correct SQL for multiple orderings', () => {
    const controller = new Controller(SampleModel);
    const query = SampleModel.query();
    controller.applyOrderByLite(query, {
      created_at: 'desc',
      'profile.name': 'asc',
      id: 'invalid',
    });
    const sql = query.toKnexQuery().toSQL().sql;
    expect(sql).toBe(
      'select `users`.* from `users` order by `users`.`created_at` desc, `profile`.`name` asc, `users`.`id` asc'
    );
  });
});
