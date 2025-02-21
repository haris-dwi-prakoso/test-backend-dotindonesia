import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Todo } from 'src/todo/entities/todo.entity';

@Entity('user')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    username: string;

    @Column()
    email: string;

    @Column('json')
    address: {
        street: string;
        suite: string;
        city: string;
        zipcode: string;
        geo: {
            lat: string;
            lng: string;
        }
    };

    @Column()
    phone: string;

    @Column()
    website: string;

    @Column('json')
    company: {
        name: string;
        catchPhrase: string;
        bs: string;
    };

    @OneToMany(() => Todo, todo => todo.user, { cascade: true })
    todos: Todo[]
}
