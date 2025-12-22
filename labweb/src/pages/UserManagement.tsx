import { useState } from 'react';
import { Edit, Power } from 'lucide-react';

type User = {
  id: string;
  name: string;
  role: 'Lab Supervisor' | 'Pathologist' | 'Lab Technician' | 'Receptionist';
  email: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
};

type Module = {
  name: string;
  view: boolean;
  edit: boolean;
  delete: boolean;
};

type Role = {
  id: string;
  name: string;
  modules: Module[];
};

const UserManagement = () => {
  // Sample user data
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Dr. John Doe',
      role: 'Lab Supervisor',
      email: 'john.doe@medlab.com',
      status: 'Active',
      lastLogin: '2 hours ago',
    },
    {
      id: '2',
      name: 'Dr. Sarah Johnson',
      role: 'Pathologist',
      email: 'sarah.j@medlab.com',
      status: 'Active',
      lastLogin: '5 minutes ago',
    },
    {
      id: '3',
      name: 'Alice Martin',
      role: 'Lab Technician',
      email: 'alice.m@medlab.com',
      status: 'Active',
      lastLogin: '1 day ago',
    },
    {
      id: '4',
      name: 'Bob Wilson',
      role: 'Lab Technician',
      email: 'bob.w@medlab.com',
      status: 'Inactive',
      lastLogin: '2 weeks ago',
    },
    {
      id: '5',
      name: 'Carol Davis',
      role: 'Receptionist',
      email: 'carol.d@medlab.com',
      status: 'Active',
      lastLogin: '30 minutes ago',
    },
  ]);

  // Sample role permissions data
  const [currentRole, setCurrentRole] = useState<Role>({
    id: 'tech',
    name: 'Lab Technician',
    modules: [
      { name: 'Dashboard', view: true, edit: true, delete: false },
      { name: 'Samples', view: true, edit: true, delete: false },
      { name: 'Analyzer Results', view: true, edit: true, delete: false },
      { name: 'QC Management', view: true, edit: true, delete: false },
      { name: 'Reports', view: true, edit: false, delete: false },
      { name: 'Users & Roles', view: false, edit: false, delete: false },
      { name: 'System Settings', view: false, edit: false, delete: false },
    ],
  });

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' } 
        : user
    ));
  };

  const togglePermission = (moduleName: string, permission: 'view' | 'edit' | 'delete') => {
    setCurrentRole({
      ...currentRole,
      modules: currentRole.modules.map(module => 
        module.name === moduleName 
          ? { ...module, [permission]: !module[permission] } 
          : module
      ),
    });
  };

  return (
    <div className="p-6">
      {/* Users Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Users</h2>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            + Add New User
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === 'Lab Supervisor' ? 'bg-purple-100 text-purple-800' : 
                        user.role === 'Pathologist' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'Lab Technician' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      className={`${user.status === 'Active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      onClick={() => toggleUserStatus(user.id)}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Role Permissions - {currentRole.name}</h2>
          <div>
            <button className="text-gray-600 hover:text-gray-900 mr-4 text-sm font-medium">
              View All Roles
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRole.modules.map((module, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {module.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={module.view}
                        onChange={() => togglePermission(module.name, 'view')}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={module.edit}
                        onChange={() => togglePermission(module.name, 'edit')}
                        disabled={!module.view}
                      />
                      <div className={`relative w-11 h-6 ${!module.view ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${!module.view ? 'peer-checked:bg-gray-400' : 'peer-checked:bg-blue-600'}`}></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={module.delete}
                        onChange={() => togglePermission(module.name, 'delete')}
                        disabled={!module.view || !module.edit}
                      />
                      <div className={`relative w-11 h-6 ${!module.view || !module.edit ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${!module.view || !module.edit ? 'peer-checked:bg-gray-400' : 'peer-checked:bg-blue-600'}`}></div>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
