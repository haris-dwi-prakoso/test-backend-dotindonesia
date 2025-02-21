import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('todo')
export class Todo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    title: string;

    @Column()
    completed: boolean;

    @ManyToOne(() => User, user => user.todos, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        orphanedRowAction: "delete"
    })
    @JoinColumn({ name: 'userId' })
    user: User;
}
